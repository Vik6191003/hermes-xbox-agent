# 🎮 Laptop Bridge Setup Guide

## What is this?
The **laptop bridge** connects your Xbox to the web app through your VPS.
```
Web App → VPS (76.13.99.138:19999) → laptop bridge → Xbox
```

## Quick Start (One-Time Setup)

### Step 1 — Install Python
1. Go to **https://python.org/downloads**
2. Download Python 3.9 or higher
3. **IMPORTANT:** During install, check ✅ "Add Python to PATH"
4. Restart your computer after installing

### Step 2 — Download the Files
1. Download from: **https://github.com/Vik6191003/hermes-xbox-agent**
2. Click "Code" → "Download ZIP"
3. Unzip to any folder on your laptop

### Step 3 — Run It
1. Open the unzipped folder
2. Double-click `start_bridge.bat`
3. A black window opens — keep it **open while you game**

> ⚠️ Keep the window open. Close it when you're done gaming.

## How it works
- Bridge connects to VPS relay (`76.13.99.138:19999`)
- VPS routes commands from the web app to the bridge
- Laptop sends commands to Xbox over WiFi

## Requirements
- Laptop on the **same WiFi** as your Xbox
- Xbox powered on
- VPS relay running (already running 24/7 on your account)

## Troubleshooting

**"No Xbox found"**
→ Your laptop must be on the SAME WiFi as your Xbox

**"Python not found"**
→ Reinstall Python and check "Add to PATH" during install

**"Connection refused"**
→ Check your internet connection

## Files
| File | Purpose |
|------|---------|
| `start_bridge.bat` | One-click launcher — run this |
| `laptop_bridge.py` | The actual script (don't run directly) |