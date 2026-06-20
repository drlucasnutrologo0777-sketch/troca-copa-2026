@echo off
cd /d "%~dp0"
title BUILD 22 - TROCAR FIGURINHAS

echo.
echo ========================================
echo   BUILD 22 - enviar GitHub + Codemagic
echo ========================================
echo.

git add lib/screens/login_screen.dart lib/widgets/copa_widgets.dart pubspec.yaml codemagic.yaml
git -c user.name="Eder Lucas Santos Tiago" -c user.email="drlucasnutrologo0777@gmail.com" commit -m "Build 22: login colors, build number 22."
if errorlevel 1 echo (commit: nada novo ou ja commitado)

echo.
echo Enviando para GitHub...
git push origin main
if errorlevel 1 (
  echo.
  echo FALHOU o push. Faca login no GitHub e rode este arquivo de novo.
  pause
  exit /b 1
)

echo.
echo OK! Abrindo Codemagic...
start "" "https://codemagic.io/apps"
echo.
echo No Codemagic:
echo   1. troca-copa-2026
echo   2. TROCA COPA 2026 - iOS
echo   3. Start new build (main, build 22)
echo.
pause
