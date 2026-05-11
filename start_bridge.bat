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
echo [1/5] Checking Python...
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
echo [2/5] Checking Python version...
python -c "import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)"
if errorlevel 1 (
    echo.
    echo   ERROR: Python 3.9+ required. Current: %PYVER%
    echo.
    pause
    exit /b 1
)
echo    OK - Python version is fine

REM ── Install websockets (pure Python, no build needed) ─────
echo [3/5] Installing websockets...
python -m pip install websockets --quiet
if errorlevel 1 (
    echo.
    echo   ERROR: Failed to install websockets.
    echo   Try running Command Prompt as Administrator.
    echo.
    pause
    exit /b 1
)
echo    OK - websockets installed

REM ── Download wheels locally (avoids build step on Python 3.14) ──
echo [4/5] Downloading Xbox SmartGlass wheel...
echo   (This avoids build issues with Python 3.14)
python -m pip download xbox-smartglass-core construct --no-deps -d "%~dp0wheels" --quiet
if errorlevel 1 (
    echo.
    echo   WARNING: Could not download wheels.
    echo   Trying direct install...
)
echo    OK - wheels downloaded

REM ── Install from local wheel (bypasses build step) ─────────
echo [5/5] Installing Xbox SmartGlass from local wheel...
for %%f in ("%~dp0wheels\*.whl") do (
    echo   Installing: %%~nxf
    python -m pip install "%%f" --no-deps --quiet
    if errorlevel 1 (
        echo   ERROR: Failed to install %%~nxf
        pause
        exit /b 1
    )
)
echo.
echo    OK - Xbox SmartGlass installed from wheel

REM ── Launch ─────────────────────────────────────────────────
echo  ============================================
echo   IMPORTANT: Your laptop must be connected
echo   to the SAME WiFi as your Xbox.
echo  ============================================
echo.
python "%~dp0laptop_bridge.py"
pause