#!/usr/bin/env python3
"""
Hermes Xbox Laptop Bridge
Runs on YOUR gaming laptop (Windows/macOS/Linux)
Connects the VPS relay → Xbox SmartGlass protocol

Requirements: Python 3.9+
  pip install xbox-smartglass-core websockets

How it works:
  This script runs on your laptop 24/7 while you game.
  Your laptop connects to Xbox via SmartGlass (local WiFi).
  VPS connects to this script via WebSocket relay.
  Commands flow: Web App → VPS → This Script → Xbox

Usage:
  python laptop_bridge.py
"""

import asyncio
import json
import logging
import sys
import argparse
from xbox.smartglass import SmartGlass
from xbox.smartglass.models import InputButton, InputTier, PowerState
import websockets.asyncio as websockets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("laptop-bridge")

# ─── CONFIG ────────────────────────────────────────────────────────────────
DEFAULT_VPS_URL = "wss://76.13.99.138:19999"
DEFAULT_TOKEN="edbb0106ff4745f5"  # Must match server BRIDGE_SECRET
# ─────────────────────────────────────────────────────────────────────────

class XboxBridge:
    def __init__(self, vps_url: str, token: str):
        self.vps_url  = vps_url
        self.token    = token
        self.sg       = None
        self.ws       = None
        self.xbox_online  = False
        self.current_game = None

    async def connect_vps(self):
        url = f"{self.vps_url}/laptop/{self.token}"
        logger.info(f"Connecting to VPS relay: {url}")
        self.ws = await websockets.connect(url)
        logger.info("✅ Connected to VPS relay")
        msg = await self.ws.recv()
        data = json.loads(msg)
        if data.get("type") == "auth_ok":
            logger.info("✅ VPS authentication successful")
        else:
            logger.error(f"❌ Auth failed: {data}")
            raise Exception("VPS auth failed")

    async def send_vps(self, data: dict):
        try:
            await self.ws.send(json.dumps(data))
        except Exception as e:
            logger.error(f"Send to VPS failed: {e}")

    async def vps_listen(self):
        try:
            async for msg in self.ws:
                data = json.loads(msg)
                await self.handle_vps_message(data)
        except websockets.exceptions.ConnectionClosed:
            logger.warning("VPS connection closed — reconnecting in 5s")
            await asyncio.sleep(5)
            await self.connect_vps()

    async def handle_vps_message(self, data: dict):
        msg_type = data.get("type", "")
        if msg_type == "ping":
            await self.send_vps({"type": "pong"})
            return
        if msg_type == "execute_plan":
            execution_id = data.get("execution_id")
            plan        = data.get("plan", [])
            logger.info(f"Executing plan {execution_id}: {len(plan)} steps")
            await self.execute_plan(execution_id, plan)
            return
        if msg_type == "cancel_execution":
            logger.info("Cancel requested")
            self._cancel_execution = True
        if msg_type == "disconnect":
            logger.info("VPS sent disconnect signal")
            await self.ws.close()

    async def connect_xbox(self):
        logger.info("Scanning for Xbox on local network...")
        sg = SmartGlass()
        devices = await sg.discover()
        if not devices:
            logger.error("❌ No Xbox found — is your laptop on the same WiFi as your Xbox?")
            await self.send_vps({
                "type": "xbox_status", "status": "error_no_xbox_found",
                "xbox_online": False, "current_game": None
            })
            return False
        console = devices[0]
        logger.info(f"Found: {console.name} @ {console.host}")
        try:
            await sg.connect(console)
            await asyncio.sleep(1)
            await sg.start_input_tunnel()
            self.sg = sg
            self.xbox_online = True
            logger.info(f"✅ Connected to Xbox: {console.name}")
        except Exception as e:
            logger.error(f"❌ Failed to connect: {e}")
            self.xbox_online = False
            return False
        await self.send_vps({
            "type": "xbox_status", "status": "online",
            "xbox_online": True, "current_game": None
        })
        return True

    async def xbox_command(self, command: str):
        if not self.sg or not self.xbox_online:
            logger.warning("Xbox not connected — skipping command")
            return False
        try:
            if command.startswith("button:"):
                btn_name = command[7:].strip()
                btn = getattr(InputButton, btn_name.upper(), None)
                if btn is None:
                    logger.error(f"Unknown button: {btn_name}")
                    return False
                await self.sg.input.send_button(btn)
                logger.info(f"✅ Button: {btn_name}")
            elif command.startswith("navigate:"):
                direction = command[10:].strip()
                mapping = {"up": InputButton.DPAD_UP, "down": InputButton.DPAD_DOWN,
                           "left": InputButton.DPAD_LEFT, "right": InputButton.DPAD_RIGHT}
                btn = mapping.get(direction)
                if not btn:
                    logger.error(f"Unknown direction: {direction}")
                    return False
                await self.sg.input.send_button(btn)
                logger.info(f"✅ Navigate: {direction}")
            elif command.startswith("wait:"):
                seconds = float(command[5:].strip())
                logger.info(f"⏳ Waiting {seconds}s...")
                await asyncio.sleep(seconds)
            elif command == "power:on":
                await self.sg.power.turn_on()
                logger.info("✅ Power on sent")
            elif command == "power:off":
                await self.sg.power.turn_off()
                logger.info("✅ Power off sent")
            else:
                logger.warning(f"Unknown command: {command}")
                return False
            return True
        except Exception as e:
            logger.error(f"Command failed: {e}")
            return False

    async def execute_plan(self, execution_id: str, plan: list):
        self._cancel_execution = False
        total = len(plan)
        for i, step in enumerate(plan):
            if self._cancel_execution:
                await self.send_vps({"type": "execution_update",
                    "execution_id": execution_id, "step": i+1, "total": total, "status": "cancelled"})
                return
            cmd = step.get("command", "")
            step_no = i + 1
            await self.send_vps({"type": "execution_update",
                "execution_id": execution_id, "step": step_no, "total": total,
                "status": "running", "command": cmd})
            success = await self.xbox_command(cmd)
            await self.send_vps({"type": "execution_update",
                "execution_id": execution_id, "step": step_no, "total": total,
                "status": "completed" if success else "error", "command": cmd})
            if step_no < total:
                await asyncio.sleep(0.5)
        await self.send_vps({"type": "execution_update",
            "execution_id": execution_id, "step": total, "total": total, "status": "completed"})
        logger.info(f"Plan {execution_id} completed ✅")

    async def report_status(self):
        while True:
            if self.ws:
                await self.send_vps({"type": "xbox_status",
                    "status": "online" if self.xbox_online else "offline",
                    "xbox_online": self.xbox_online, "current_game": self.current_game})
            await asyncio.sleep(30)

    async def run(self):
        await self.connect_vps()
        await self.connect_xbox()
        await asyncio.gather(self.vps_listen(), self.report_status())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hermes Xbox Laptop Bridge")
    parser.add_argument("--vps-url", default=DEFAULT_VPS_URL)
    parser.add_argument("--token",   default=DEFAULT_TOKEN)
    args = parser.parse_args()
    print("""
╔══════════════════════════════════════════════╗
║       🎮  Hermes Xbox Laptop Bridge  🎮       ║
╠══════════════════════════════════════════════╣
║  Make sure your laptop is on the SAME WiFi  ║
║  as your Xbox. Python 3.9+ required.         ║
╚══════════════════════════════════════════════╝
    """)
    bridge = XboxBridge(vps_url=args.vps_url, token=args.token)
    try:
        asyncio.run(bridge.run())
    except KeyboardInterrupt:
        print("\n👋 Bridge stopped.")
