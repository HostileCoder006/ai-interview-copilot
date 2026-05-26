@echo off
title AI Interview Copilot
color 0A

echo.
echo  ============================================
echo   AI Copilot for Technical Interviews
echo  ============================================
echo.

REM --- Check Node ---
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 18+ from nodejs.org
    pause
    exit /b 1
)

echo [1/2] Installing dependencies...
if not exist node_modules (
    npm install
    echo       Done
) else (
    echo       node_modules already exists, skipping
)

echo [2/2] Starting dev server...
echo.
echo  App -> http://localhost:3000
echo.
echo  Press Ctrl+C to stop.
echo.

npm run dev
pause
