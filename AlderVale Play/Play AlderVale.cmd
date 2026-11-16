@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS, then reopen this launcher.
  if not defined CI pause
  exit /b 1
)
node "%~dp0play.mjs" %*
if errorlevel 1 (
  if not defined CI pause
  exit /b 1
)
