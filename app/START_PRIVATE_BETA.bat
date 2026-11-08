@echo off
setlocal
cd /d "%~dp0"
echo THE PROXY PLANE - PRIVATE BETA
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 or later, then run this again.
 pause
 exit /b 1
)
if not exist .env (
 copy .env.beta.example .env >nul
 echo Created .env. Read BETA_SETUP.md and enter your Supabase settings first.
 notepad .env
 pause
)
if not exist node_modules (
 call npm install
 if errorlevel 1 (
  pause
  exit /b 1
 )
)
call npm run beta:setup
if errorlevel 1 (
 echo Follow BETA_SETUP.md to complete account/database setup.
 pause
 exit /b 1
)
call npm start
pause
