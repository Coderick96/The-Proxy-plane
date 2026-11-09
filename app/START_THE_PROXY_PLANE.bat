@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 goto failed
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js is required. Install Node.js LTS, then reopen this launcher.
 pause
 exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
 echo npm was not found. Reinstall Node.js LTS, then reopen this launcher.
 pause
 exit /b 1
)
echo Preparing The Proxy Plane. Internet access may be needed.
call npm install
if errorlevel 1 goto failed
echo Opening The Proxy Plane. Keep this window open while using it.
echo To stop: press Ctrl+C, then Y if asked.
call npm start
if errorlevel 1 goto failed
popd
exit /b 0
:failed
echo.
echo The Proxy Plane could not start. If port 5173 is already in use, stop the old server first.
echo Keep this window open and share the error above.
pause
exit /b 1
