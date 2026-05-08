'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Gamepad2, Upload, History, Wifi, WifiOff, Monitor, AlertCircle, CheckCircle2, Play } from 'lucide-react';

const VPS_WS = 'wss://76.13.99.138:19999/web';

type XboxStatus = 'online' | 'offline' | 'connecting';
type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface PlanStep {
  id: number;
  action: string;
  button: string;
  duration?: number;
  repeat?: number;
  status: StepStatus;
}

interface ExecutionState {
  id: string;
  plan: PlanStep[];
  currentStep: number;
  status: 'idle' | 'running' | 'done' | 'cancelled' | 'error';
}

export default function Home() {
  const [xboxStatus, setXboxStatus] = useState<XboxStatus>('connecting');
  const [laptopConnected, setLaptopConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [execution, setExecution] = useState<ExecutionState | null>(null);
  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  // WebSocket connection to VPS
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(VPS_WS);
        ws.onopen = () => {
          setWsConnected(true);
          setXboxStatus('connecting');
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'web_connected') {
            setLaptopConnected(data.laptop_connected || false);
            setXboxStatus(data.xbox_online ? 'online' : 'offline');
          }
          if (data.type === 'xbox_status_update') {
            setXboxStatus(data.xbox_online ? 'online' : 'offline');
          }
          if (data.type === 'laptop_disconnected') {
            setLaptopConnected(false);
            setXboxStatus('offline');
          }
          if (data.type === 'execution_update') {
            setExecution((prev) => {
              if (!prev) return prev;
              const newPlan = [...prev.plan];
              if (data.status === 'running') {
                newPlan[data.step - 1] = { ...newPlan[data.step - 1], status: 'running' };
              } else if (data.status === 'completed') {
                newPlan[data.step - 1] = { ...newPlan[data.step - 1], status: 'done' };
              }
              return { ...prev, plan: newPlan, currentStep: data.step, status: data.status === 'completed' ? 'done' : 'running' };
            });
            setExecutionLog((prev) => [...prev, `Step ${data.step}/${data.total}: ${data.status}`]);
          }
        };
        ws.onclose = () => {
          setWsConnected(false);
          setLaptopConnected(false);
          reconnectTimer = setTimeout(connect, 3000);
        };
        ws.onerror = () => ws?.close();
      } catch {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  // Load sample plan
  const loadSamplePlan = () => {
    setPlan([
      { id: 1, action: 'Navigate to game', button: 'A', duration: 1, status: 'pending' },
      { id: 2, action: 'Move to quest giver', button: 'LS-Up', duration: 2, status: 'pending' },
      { id: 3, action: 'Talk to NPC', button: 'A', status: 'pending' },
      { id: 4, action: 'Accept quest', button: 'A', status: 'pending' },
      { id: 5, action: 'Repeat: Mining run', button: 'A', repeat: 30, status: 'pending' },
    ]);
  };

  const updateStep = (index: number, field: keyof PlanStep, value: string | number) => {
    const newPlan = [...plan];
    newPlan[index] = { ...newPlan[index], [field]: value };
    setPlan(newPlan);
  };

  const executePlan = () => {
    if (!wsConnected || !laptopConnected) return;
    const ws = (window as any)._xboxWs;
    if (!ws) return;
    const execId = Math.random().toString(36).slice(2, 10);
    setExecution({ id: execId, plan: plan.map((s) => ({ ...s, status: 'pending' })), currentStep: 0, status: 'running' });
    setExecutionLog([]);
    ws.send(JSON.stringify({ type: 'execute_plan', plan, execution_id: execId }));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Gamepad2 size={28} color="#00d4ff" />
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Hermes Xbox</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link href="/upload" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00d4ff', textDecoration: 'none', fontSize: 14 }}>
            <Upload size={16} /> Upload Video
          </Link>
          <Link href="/tasks" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', textDecoration: 'none', fontSize: 14 }}>
            <History size={16} /> Task History
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Status Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          <StatusCard
            icon={<Wifi size={20} />}
            label="VPS Connection"
            value={wsConnected ? 'Connected' : 'Disconnected'}
            color={wsConnected ? '#00ff88' : '#ff4444'}
          />
          <StatusCard
            icon={<Monitor size={20} />}
            label="Laptop Bridge"
            value={laptopConnected ? 'Online' : 'Offline'}
            color={laptopConnected ? '#00ff88' : '#ffaa00'}
          />
          <StatusCard
            icon={<Gamepad2 size={20} />}
            label="Xbox Series S"
            value={xboxStatus === 'online' ? 'Online' : xboxStatus === 'offline' ? 'Off' : '...'}
            color={xboxStatus === 'online' ? '#00ff88' : xboxStatus === 'offline' ? '#ff4444' : '#888'}
          />
        </div>

        {/* Not connected warning */}
        {(!wsConnected || !laptopConnected) && (
          <div style={{ background: '#1a1a2e', border: '1px solid #ffaa00', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertCircle size={20} color="#ffaa00" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Setup not complete</p>
                <p style={{ margin: 0, fontSize: 14, color: '#aaa' }}>
                  {!wsConnected && <>WebSocket not connected to VPS. "hermes-xbox" server may not be running on the VPS.</>}
                  {wsConnected && !laptopConnected && <>Laptop bridge is offline. Run the bridge script on your laptop and keep it open.</>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Editor */}
        <div style={{ background: '#0f0f1a', border: '1px solid #1a1a2e', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Execution Plan</h2>
            <button onClick={loadSamplePlan} style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
              Load Sample Plan
            </button>
          </div>

          {plan.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#555' }}>
              <p>No plan loaded. Upload a video or load a sample plan.</p>
              <Link href="/upload" style={{ color: '#00d4ff', textDecoration: 'none', fontSize: 14 }}>Go to Video Upload →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.map((step, idx) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0a0a0f', borderRadius: 8, padding: '12px 16px', border: '1px solid #1a1a2e' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: step.status === 'done' ? '#00ff88' : step.status === 'running' ? '#00d4ff' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: step.status === 'pending' ? '#888' : '#000', flexShrink: 0 }}>
                    {step.status === 'done' ? <CheckCircle2 size={14} /> : step.id}
                  </span>
                  <div style={{ flex: 1 }}>
                    {editingStep === idx ? (
                      <input
                        autoFocus
                        value={step.action}
                        onChange={(e) => updateStep(idx, 'action', e.target.value)}
                        onBlur={() => setEditingStep(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingStep(null)}
                        style={{ background: '#1a1a2e', border: '1px solid #00d4ff', borderRadius: 4, padding: '4px 8px', color: '#fff', fontSize: 14, width: '100%' }}
                      />
                    ) : (
                      <span onClick={() => setEditingStep(idx)} style={{ cursor: 'text', color: step.status === 'running' ? '#00d4ff' : '#e0e0e0' }}>
                        {step.action}
                        {step.repeat && <span style={{ color: '#888', fontSize: 12 }}> × {step.repeat}×</span>}
                      </span>
                    )}
                  </div>
                  <span style={{ background: '#1a1a2e', padding: '4px 8px', borderRadius: 4, fontSize: 12, color: '#00d4ff', fontFamily: 'monospace' }}>{step.button}</span>
                  {step.duration && <span style={{ color: '#666', fontSize: 12 }}>{step.duration}s</span>}
                  {editingStep !== idx && (
                    <button onClick={() => setEditingStep(idx)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11 }}>edit</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {plan.length > 0 && (
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button
                onClick={executePlan}
                disabled={!wsConnected || !laptopConnected || execution?.status === 'running'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: wsConnected && laptopConnected ? '#00ff88' : '#333',
                  color: wsConnected && laptopConnected ? '#000' : '#666',
                  border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 700, fontSize: 15, cursor: wsConnected && laptopConnected ? 'pointer' : 'not-allowed',
                }}
              >
                <Play size={18} fill={wsConnected && laptopConnected ? '#000' : '#666'} />
                Execute Plan
              </button>
              <button
                onClick={() => { setPlan([]); setExecution(null); setExecutionLog([]); }}
                style={{ background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', fontSize: 14 }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Execution Log */}
        {executionLog.length > 0 && (
          <div style={{ background: '#0f0f1a', border: '1px solid #1a1a2e', borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Execution Log</h3>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#00ff88', maxHeight: 200, overflowY: 'auto' }}>
              {executionLog.map((log, i) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #1a1a2e' }}>{'>'} {log}</div>
              ))}
              {execution?.status === 'done' && <div style={{ color: '#00ff88', marginTop: 8 }}>✅ Plan completed successfully.</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#0f0f1a', border: '1px solid #1a1a2e', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ color }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color }}>{value}</div>
      </div>
    </div>
  );
}
