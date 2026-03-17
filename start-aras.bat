@echo off
title Aras Antivirus
cd /d "%~dp0"
echo ========================================
echo   Aras Antivirus Baslatiliyor...
echo   Frontend + Backend birlikte
echo ========================================
echo.
set MOLE_DEV=1
call npm run dev
pause
