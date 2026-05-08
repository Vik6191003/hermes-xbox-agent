@echo off
title Hermes Xbox Bridge
color 0A
mode con: cols=72 lines=25

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║       🎮  Hermes Xbox Bridge Launcher  🎮     ║
echo  ╚══════════════════════════════════════════════╝
echo.

REM ── Check Python ──────────────────────────────────────────
echo [1/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found!
    echo.
    echo Please install Python 3.9+ from:
    echo   https://python.org/downloads
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo    Found Python %PYVER%

REM ── Check Python version (need 3.9+) ──────────────────────
echo [2/4] Checking Python version (need 3.9+)...
python -c "import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)"
if errorlevel 1 (
    echo ❌ Python 3.9+ required. Current: %PYVER%
    pause
    exit /b 1
)
echo    ✓ Python version OK

REM ── Install dependencies ──────────────────────────────────
echo [3/4] Installing dependencies (first time only)...
python -m pip install xbox-smartglass-core websockets --quiet
if errorlevel 1 (
    echo ❌ Failed to install dependencies.
    echo Try running this as Administrator.
    pause
    exit /b 1
)
echo    ✓ Dependencies installed

REM ── Launch ────────────────────────────────────────────────
echo [4/4] Starting bridge...
echo.
echo ═══════════════════════════════════════════════════════════
echo  Make sure your laptop is on the SAME WiFi as your Xbox.
echo  Keep this window OPEN while you game.
echo ═══════════════════════════════════════════════════════════
echo.
python "%~dp0laptop_bridge.py"
pause
