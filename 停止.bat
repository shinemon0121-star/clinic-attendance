@echo off
chcp 65001 > nul
title Smart Attendance - 停止

echo ==============================
echo  Smart Attendance を停止します
echo ==============================
echo.

:: node プロセスを終了
taskkill /F /IM node.exe > nul 2>&1

echo ✓ サーバーを停止しました。
echo.
pause
