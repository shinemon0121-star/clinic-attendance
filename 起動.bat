@echo off
chcp 65001 > nul
title Smart Attendance

set APP_DIR=C:UsersSTH-ME001DDesktopä ¡·¹Æà_App

netstat -ano | findstr ":5173 " > /dev/null 2>&1
if %errorlevel% == 0 goto OPEN_BROWSER

echo µüÐü’wÕWfD~Y...
cd /d "%APP_DIR%"
start "Smart Attendance" /min cmd /c ""C:Program Files
odejs
pm.cmd" run dev"
timeout /t 6 /nobreak > nul

:OPEN_BROWSER
echo Öé¦¶’wÕ...
start "" "http://localhost:5173"
timeout /t 2 /nobreak > nul
start "" "http://localhost:5174"
exit