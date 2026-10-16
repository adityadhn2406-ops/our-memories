@echo off
title US Memories - Private Archive
cd /d "%~dp0"
echo ========================================================
echo   Starting US Memories Web Server
echo ========================================================
echo.
echo Opening http://localhost:8000 in your default browser...
start http://localhost:8000
python -m http.server 8000
pause
