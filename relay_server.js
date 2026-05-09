#!/usr/bin/env node
/**
 * Hermes Xbox Agent - VPS WebSocket Relay Server
 * Bridges: Web App ←→ VPS Relay ←→ Laptop Bridge ←→ Xbox SmartGlass
 * 
 * Run: node relay_server.js
 * Keeps running: use PM2 or systemd
 */

const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 19999;
const TOKEN = 'edbb0106ff4745f5';

const clients = new Set();       // Web app clients
const laptopBridges = new Set(); // Laptop bridge connections

let xboxOnline = false;
let laptopConnected = false;

// ─── HTTP Server (health checks) ───────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      xbox: xboxOnline ? 'online' : 'offline',
      laptop: laptopConnected,
      clients: clients.size,
      bridges: laptopBridges.size
    }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hermes Xbox Relay Server\n');
});

// ─── WebSocket Server ───────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer, path: '/web' });

function sendToAll(array, msg) {
  const data = JSON.stringify(msg);
  for (const client of array) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function broadcastStatus() {
  const msg = {
    type: 'web_connected',
    laptop_connected: laptopConnected,
    xbox_online: xboxOnline,
    clients: clients.size
  };
  sendToAll(clients, msg);
}

wss.on('connection', (ws, req) => {
  // Check auth header or token param
  const url = new URL(req.url, `http://localhost`);
  const token = url.searchParams.get('token') || 
    req.headers['x-bridge-token'] || 
    req.headers['authorization']?.replace('Bearer ', '');
  
  if (token !== TOKEN) {
    console.log('[RELAY] Unauthorized connection attempt');
    ws.close(1008, 'Unauthorized');
    return;
  }

  // Determine if this is a laptop bridge or web client
  const isBridge = url.searchParams.get('bridge') === '1' || 
    req.headers['x-bridge-client'] === '1';

  if (isBridge) {
    console.log('[RELAY] Laptop bridge connected');
    laptopBridges.add(ws);
    laptopConnected = true;
    broadcastStatus();
  } else {
    console.log('[RELAY] Web client connected');
    clients.add(ws);
    // Send current status immediately
    ws.send(JSON.stringify({
      type: 'web_connected',
      laptop_connected: laptopConnected,
      xbox_online: xboxOnline,
      clients: clients.size
    }));
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      console.log('[RELAY] Message:', msg.type, isBridge ? '(bridge)' : '(web)');

      switch (msg.type) {
        case 'bridge_status':
          // Laptop bridge reports Xbox status
          xboxOnline = msg.xbox_online || false;
          laptopConnected = msg.laptop_connected || false;
          broadcastStatus();
          break;

        case 'execute_step':
          // Web client wants to execute a step → forward to bridge
          if (laptopBridges.size > 0) {
            const bridge = laptopBridges.values().next().value;
            bridge.send(JSON.stringify({
              type: 'execute',
              step: msg.step,
              stepId: msg.stepId
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'No laptop bridge connected'
            }));
          }
          break;

        case 'execution_log':
          // Forward execution log to all web clients
          sendToAll(clients, msg);
          break;

        case 'cancel_execution':
          // Forward cancel to bridge
          for (const bridge of laptopBridges) {
            bridge.send(JSON.stringify({ type: 'cancel' }));
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          // Relay broadcast messages between bridge and web
          if (isBridge) {
            sendToAll(clients, msg);
          } else {
            for (const bridge of laptopBridges) {
              bridge.send(raw.toString());
            }
          }
      }
    } catch (e) {
      console.error('[RELAY] Parse error:', e.message);
    }
  });

  ws.on('close', () => {
    if (isBridge) {
      console.log('[RELAY] Laptop bridge disconnected');
      laptopBridges.delete(ws);
      laptopConnected = false;
      xboxOnline = false;
      broadcastStatus();
    } else {
      console.log('[RELAY] Web client disconnected');
      clients.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error('[RELAY] Socket error:', err.message);
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   Hermes Xbox Relay Server                   ║
║   Listening on ws://0.0.0.0:${PORT}/web     ║
║   Token: ${TOKEN}                       ║
╚══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[RELAY] Shutting down...');
  httpServer.close();
  process.exit(0);
});