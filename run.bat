@echo off
setlocal

cd /d "%~dp0"

if not exist "package.json" (
  echo package.json not found.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not installed or not available in PATH.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Failed to install dependencies.
    pause
    exit /b 1
  )
)

start "" http://localhost:3000
echo Starting Openjacks dev server on http://localhost:3000
call npm run dev

endlocal
