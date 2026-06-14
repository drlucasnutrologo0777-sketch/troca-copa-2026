@echo off
cd /d "%~dp0"
title TROCA COPA 2026

echo.
echo ========================================
echo   TROCA COPA 2026
echo ========================================
echo.
echo Pasta: %CD%
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERRO: Git nao instalado.
  echo Baixe em: https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

echo [1/3] Preparando app...
if not exist ".git" (
  git init
  git branch -M main
)
git add .
git -c user.name="Eder Lucas" -c user.email="drlucasnutrologo0777@gmail.com" commit -m "TROCA COPA 2026" 2>nul
echo OK.
echo.
echo Pressione ENTER...
pause >nul

echo.
echo [2/3] Abrindo GitHub...
echo Crie repositorio: troca-copa-2026
echo Clique Create repository (verde)
echo.
start "" "https://github.com/new?name=troca-copa-2026"
echo Pressione ENTER depois de criar...
pause >nul

echo.
set "REPOURL="
set /p REPOURL=COLE o endereco do GitHub aqui: 

if "%REPOURL%"=="" (
  echo Nada colado. Feche e abra INICIAR.cmd de novo.
  pause
  exit /b 1
)

git remote remove origin 2>nul
git remote add origin "%REPOURL%"
echo Enviando...
git -c user.name="Eder Lucas" -c user.email="drlucasnutrologo0777@gmail.com" push -u origin main
if errorlevel 1 (
  echo.
  echo FALHOU. Faca login no GitHub e rode INICIAR.cmd de novo.
  pause
  exit /b 1
)

echo.
echo [3/3] SUCESSO! Abrindo Codemagic...
start "" "https://codemagic.io/apps"
echo.
echo No Codemagic: Add application - troca-copa-2026
echo Flutter path: .
echo Start build: TROCA COPA 2026 - iOS
echo.
pause
