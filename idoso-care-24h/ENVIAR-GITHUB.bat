@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Idoso Care 24H - GitHub

echo.
echo ========================================
echo   ENVIAR PARA GITHUB
echo ========================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERRO: Git nao instalado. Baixe em https://git-scm.com/download/win
  pause
  exit /b 1
)

if not exist ".git" (
  git init
  git branch -M main
)

git add .
git -c user.name="Eder Lucas" -c user.email="drlucasnutrologo0777@gmail.com" commit -m "Idoso Care 24H — pronto Codemagic TestFlight" 2>nul

git remote remove origin 2>nul
git remote add origin https://github.com/drlucasnutrologo0777-sketch/idoso-care-24h.git

echo.
echo Enviando para GitHub...
git push -u origin main

if errorlevel 1 (
  echo.
  echo Se falhou, crie o repo vazio primeiro:
  echo https://github.com/new
  echo Nome: idoso-care-24h
  echo Depois rode este .bat de novo.
  pause
  exit /b 1
)

echo.
echo OK! Repo: https://github.com/drlucasnutrologo0777-sketch/idoso-care-24h
echo.
echo Proximo: abra https://codemagic.io/apps
echo Add application - idoso-care-24h - Start build
echo.
start https://codemagic.io/apps/add
pause
