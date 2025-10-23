@echo off
setlocal ENABLEDELAYEDEXPANSION
cd /d %~dp0
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js niet gevonden. Installeer Node 18+ en run opnieuw.
  echo     Snelle optie: winget install OpenJS.NodeJS.LTS
  pause
  exit /b 1
)
call npm i || goto :err
call npm start
exit /b 0
:err
echo [!] npm install/start faalde.
pause
exit /b 1
