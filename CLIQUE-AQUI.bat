@echo off
chcp 65001 >nul
title TROCA COPA 2026
cd /d "%~dp0"
color 0A

:PASSO1
cls
echo.
echo   ==================================================
echo     TROCA COPA 2026  -  PASSO 1
echo   ==================================================
echo.
echo   Preparando app no seu computador...
echo.

if not exist ".git" (
  git init
  git branch -M main
)
git add .
git -c user.name="Eder Lucas" -c user.email="drlucasnutrologo0777@gmail.com" commit -m "TROCA COPA 2026" 2>nul

echo   Pronto.
echo.
echo   Pressione ENTER para continuar...
pause >nul

:PASSO2
cls
echo.
echo   ==================================================
echo     PASSO 2  -  GITHUB
echo   ==================================================
echo.
echo   Vou abrir o GitHub agora.
echo.
echo   La dentro faca SO ISTO:
echo.
echo     1) Nome do repositorio:  troca-copa-2026
echo     2) NAO marque README
echo     3) Clique no botao verde  Create repository
echo.
start https://github.com/new?name=troca-copa-2026
echo.
echo   Depois que criou, volte AQUI.
echo   Pressione ENTER...
pause >nul

cls
echo.
echo   ==================================================
echo     COLE O ENDERECO DO GITHUB
echo   ==================================================
echo.
echo   No GitHub, copie o endereco do repositorio.
echo   Exemplo: https://github.com/seu-usuario/troca-copa-2026
echo.
set /p REPOURL=   Cole aqui e aperte ENTER: 

if "%REPOURL%"=="" (
  echo.
  echo   Voce nao colou nada. Tente de novo.
  pause
  goto PASSO2
)

git remote remove origin 2>nul
git remote add origin "%REPOURL%"
echo.
echo   Enviando para o GitHub... aguarde...
echo   (Se pedir login, faca login no navegador e rode de novo)
echo.

git -c user.name="Eder Lucas" -c user.email="drlucasnutrologo0777@gmail.com" push -u origin main
if errorlevel 1 (
  color 0C
  echo.
  echo   ==================================================
  echo     NAO CONSEGUI ENVIAR
  echo   ==================================================
  echo.
  echo   Faca login no GitHub no Chrome e execute CLIQUE-AQUI.bat de novo.
  echo   Ou me mande print do erro.
  echo.
  pause
  exit /b 1
)

:PASSO3
color 0A
cls
echo.
echo   ==================================================
echo     SUCESSO!  Codigo no GitHub.
echo   ==================================================
echo.
echo   PASSO 3  -  CODEMAGIC (ultimo passo)
echo.
echo   Vou abrir o Codemagic.
echo.
echo   La faca SO ISTO:
echo.
echo     1) Add application
echo     2) Escolha:  troca-copa-2026
echo     3) Settings - Flutter path:  .
echo     4) Settings - Build:  codemagic.yaml
echo     5) Code signing - Bundle:  com.mycompany.trocafigurinha
echo     6) Start build - workflow  TROCA COPA 2026 - iOS
echo.
start https://codemagic.io/apps
echo.
echo   Quando o build ficar VERDE, abra TestFlight no iPhone.
echo.
echo   FIM. Pode fechar esta janela.
echo.
pause
