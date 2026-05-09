@echo off
title Hermes Xbox Bridge
color 0A
mode con: cols=72 lines=25

echo.
echo  ============================================
echo        HERMES XBOX BRIDGE LAUNCHER
echo  ============================================
echo.

REM ── Check Python ──────────────────────────────────────────
echo [1/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo   ERROR: Python is not installed!
    echo.
    echo   Go here to download Python:
    echo   https://python.org/downloads
    echo.
    echo   Download and run the installer.
    echo   MAKE SURE to check "Add Python to PATH"
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo    Found Python %PYVER%

REM ── Check Python version (need 3.9+) ──────────────────────
echo [2/4] Checking Python version...
python -c "import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)"
if errorlevel 1 (
    echo.
    echo   ERROR: Python 3.9+ required. Current: %PYVER%
    echo.
    pause
    exit /b 1
)
echo    OK - Python version is fine

REM ── Install dependencies ──────────────────────────────────
echo [3/4] Installing dependencies...
echo.
echo   This takes about 2 minutes.
echo   You will see progress below:
echo.
python -m pip install xbox-smartglass-core websockets
if errorlevel 1 (
    echo.
    echo   ERROR: Failed to install dependencies.
    echo   Try running Command Prompt as Administrator:
    echo   Press Windows key, type "cmd", right-click,
    echo   choose "Run as administrator"
    echo.
    pause
    exit /b 1
)
echo.
echo    OK - Dependencies installed

REM ── Launch ────────────────────────────────────────────────
echo [4/4] Starting bridge...
echo.
echo  ============================================
echo   IMPORTANT: Your laptop must be connected
echo   to the SAME WiFi as your Xbox.
echo  ============================================
echo.
python "%~dp0laptop_bridge.py"
pause