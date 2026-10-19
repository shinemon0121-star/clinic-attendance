@echo off
cd /d "%~dp0"

:loop
echo [%date% %time%] tap_bridge.py starting >> bridge.log
python tap_bridge.py >> bridge.log 2>&1
echo [%date% %time%] tap_bridge.py stopped. Restarting in 5 seconds... >> bridge.log
timeout /t 5 /nobreak >nul
goto loop
