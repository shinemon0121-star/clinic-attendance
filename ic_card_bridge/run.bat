@echo off
cd /d "%~dp0"
python tap_bridge.py >> bridge.log 2>&1
