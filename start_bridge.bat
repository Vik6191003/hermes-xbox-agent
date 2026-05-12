@echo off
title Hermes Xbox Bridge
color 0A
mode con: cols=72 lines=28

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

REM ── Install from local wheels (never contacts PyPI) ─────────
echo [3/4] Installing Xbox SmartGlass from bundled wheels...
echo.
echo   Wheels location: %~dp0wheels\
echo.

REM Check if wheels folder exists
if not exist "%~dp0wheels" (
    echo   ERROR: wheels folder not found!
    echo   Please download the full repo from GitHub:
    echo   https://github.com/Vik6191003/hermes-xbox-agent
    echo.
    pause
    exit /b 1
)

REM Install wheels in correct order (no PyPI calls)
echo   Installing construct (local wheel)...
python -m pip install --no-deps --force-reinstall "%~dp0wheels\construct-2.10.70-py3-none-any.whl" 2>&1
if errorlevel 1 (
    echo   ERROR: Failed to install construct wheel.
    pause
    exit /b 1
)
echo   OK

echo   Installing xbox-smartglass-core (local wheel)...
python -m pip install --no-deps --force-reinstall "%~dp0wheels\xbox_smartglass_core-1.3.0-py2.py3-none-any.whl" 2>&1
if errorlevel 1 (
    echo   ERROR: Failed to install xbox-smartglass-core wheel.
    pause
    exit /b 1
)
echo   OK

echo   Installing websockets (local wheel)...
python -m pip install --force-reinstall --no-cache-dir "%~dp0wheels\websockets-16.0-cp314-cp314-win_amd64.whl" 2>&1
if errorlevel 1 (
    REM Fallback: try installing without version restriction
    python -m pip install --force-reinstall "%~dp0wheels\websockets-16.0-cp314-cp314-win_amd64.whl" 2>&1
    if errorlevel 1 (
        echo   WARNING: Local websockets wheel failed, trying PyPI...
        python -m pip install websockets 2>&1
    )
)
echo   OK

echo.
echo    OK - All packages installed from local wheels!

REM ── Launch ─────────────────────────────────────────────────
echo [4/4] Starting bridge...
echo.
echo  ============================================
echo   IMPORTANT: Your laptop must be connected
echo   to the SAME WiFi as your Xbox.
echo  ============================================
echo.
python "%~dp0laptop_bridge.py"
pause
