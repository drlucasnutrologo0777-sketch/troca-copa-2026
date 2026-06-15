@echo off
setlocal
set "KEY=%~dp0private\ios_distribution_private_key.pem"
if not exist "%KEY%" (
  echo Arquivo nao encontrado: %KEY%
  pause
  exit /b 1
)
powershell -NoProfile -Command "Get-Content -Raw '%KEY%' | Set-Clipboard"
echo Chave CERTIFICATE_PRIVATE_KEY copiada para a area de transferencia.
echo.
echo No Codemagic: troca-copa-2026 -^> Environment variables -^> troca_copa_apple
echo Adicione: CERTIFICATE_PRIVATE_KEY = Ctrl+V (marcar Secret)
echo.
start "" "https://codemagic.io/apps"
pause
