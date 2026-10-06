
@echo off
if /I not "%~1"=="RUN" (
  start "Subir fix iPhone" cmd /k "%~f0" RUN
  exit /b 0
)
cd /d "%~dp0\.."
title Subir fix Codemagic / Apple 403
echo.
echo  Isto manda o FIX pro GitHub. Codemagic SO le do GitHub.
echo  Pasta: %CD%
echo.

where git >nul 2>&1 || (echo Instale Git: https://git-scm.com/download/win & pause & exit /b 1)

git add codemagic.yaml ^
  ios/codemagic_signing/app_store.mobileprovision ^
  idoso-care-24h/ios/codemagic_signing/app_store.mobileprovision ^
  idoso-care-24h/ios/codemagic_signing/ExportOptions.plist ^
  idoso-care-24h/tool/ci_apple_signing.sh ^
  idoso-care-24h/pubspec.yaml ^
  idoso-care-24h/ios/IC24_IOS_BUILD.txt ^
  idoso-care-24h/ios/Flutter/Version.xcconfig

git status --short
echo.
set /p OK=Enter para COMMIT+ PUSH (ou Ctrl+C para cancelar):

git -c user.name="Lucas Nutrologo" -c user.email="drlucasnutrologo0777@gmail.com" commit -m "fix(ios): Idoso Care assinatura Apple sem G279 + build 72"
if errorlevel 1 (
  echo Nada novo para commitar OU deu erro acima.
  pause
  exit /b 1
)

git push origin main
if errorlevel 1 (
  echo.
  echo PUSH falhou — faca login GitHub no navegador que abrir OU use:
  echo https://github.com/drlucasnutrologo0777-sketch/troca-copa-2026/upload/main
  start "" "https://github.com/drlucasnutrologo0777-sketch/troca-copa-2026/upload/main"
) else (
  echo.
  echo OK! Agora Codemagic:
  start "" "https://codemagic.io/apps"
)
pause
