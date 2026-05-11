@echo off
cd /d "%~dp0"
if not exist "dist\renderer\index.html" (
  call npm run build
  if errorlevel 1 exit /b %errorlevel%
)
call npm start
exit /b %errorlevel%
