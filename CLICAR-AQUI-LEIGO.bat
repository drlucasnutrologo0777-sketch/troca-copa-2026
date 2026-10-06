@echo off
chcp 65001 >nul 2>&1
title Idoso Care 24H — menu leigo
cd /d "%~dp0"
color 1F
echo.
echo  (janela OK — se voce le isto, funcionou)
echo.

:menu
cls
echo.
echo  ============================================================
echo    IDOSO CARE — CLIQUE COM O NUMERO E ENTER
echo    (esta janela NAO some sozinha)
echo  ============================================================
echo.
echo    1 = Enviar codigo pro GitHub (commit + push)
echo    2 = Abrir Codemagic (build iPhone) no navegador
echo    3 = Publicar Firebase (site + regras + funcoes)
echo    4 = Abrir Firebase no navegador
echo    0 = So fechar esta janela (digite exit)
echo.
set /p op="Numero: "

if "%op%"=="1" goto github
if "%op%"=="2" goto codemagic
if "%op%"=="3" goto firebase
if "%op%"=="4" goto fbweb
if "%op%"=="0" goto fim
goto menu

:github
call "%~dp0LEIGO-GITHUB.bat"
echo.
pause
goto menu

:codemagic
start https://codemagic.io/apps
echo Abri Codemagic. Clique: troca-copa-2026 ^> Start new build ^> Idoso Care 24H iOS TestFlight
echo.
pause
goto menu

:firebase
call "%~dp0firebase-deploy\DEPLOY-IC24.bat"
goto menu

:fbweb
start https://console.firebase.google.com/project/idoso-care-24h/overview
pause
goto menu

:fim
echo Digite exit para fechar a janela preta.
goto menu
