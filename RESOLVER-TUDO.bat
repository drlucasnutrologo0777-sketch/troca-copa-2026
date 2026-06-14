@echo off
chcp 65001 >nul
title TROCA COPA 2026 — Resolver GitHub + Codemagic
cd /d "%~dp0"

echo.
echo ============================================================
echo   TROCA COPA 2026 — Preparando Git e GitHub
echo ============================================================
echo.

if not exist ".git" (
  git init
  git branch -M main
)

git add .
git status -sb

echo.
echo Criando commit local...
git commit -m "TROCA COPA 2026 — app pronto para Codemagic iOS" 2>nul
if errorlevel 1 (
  echo [AVISO] Nada novo para commitar ou commit ja existe.
)

echo.
echo ============================================================
echo   AGORA NO GITHUB (vai abrir no navegador)
echo ============================================================
echo.
echo 1) Crie repositorio com nome:  troca-copa-2026
echo 2) NAO marque "Add README"
echo 3) Clique Create repository
echo 4) Copie os comandos abaixo e cole no PowerShell:
echo.
echo    cd "%CD%"
echo    git remote add origin https://github.com/drlucasnutrologo0777-esbo%C3%A7o/troca-copa-2026.git
echo    git push -u origin main
echo.
echo    (Se der erro no link, use o link que o GitHub mostrar na tela)
echo.

start https://github.com/new?name=troca-copa-2026
start https://codemagic.io/apps
start https://appstoreconnect.apple.com/apps
notepad "%~dp0SO-3-PASSOS-IPHONE.txt"

pause
