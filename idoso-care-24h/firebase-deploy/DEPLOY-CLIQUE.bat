@echo off
echo Idoso Care 24H — Firebase deploy (hosting + regras)
cd /d "%~dp0"
echo Copiando web_app...
if exist public rmdir /s /q public
xcopy /E /I /Y "..\web_app" "public" >nul
echo Deploy...
firebase deploy --only hosting,database,firestore:rules,storage --project idoso-care-24h
pause
