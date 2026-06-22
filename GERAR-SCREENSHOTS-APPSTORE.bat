@echo off
cd /d "%~dp0.."
echo Gerando screenshots App Store (Build 24)...
python tool/gerar_screenshots_appstore.py
pause
