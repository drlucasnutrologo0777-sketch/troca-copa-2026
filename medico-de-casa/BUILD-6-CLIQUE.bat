@echo off
chcp 65001 >nul
echo.
echo ============================================================
echo  MEDICO DE CASA — BUILD 6 — TestFlight (1.0.0+6)
echo ============================================================
echo.
echo Ultimo upload Apple (ASC): veja ios\ASC_LAST_UPLOADED_BUILD.txt
echo Este build: 6 (sempre MAIOR que o ultimo aceito pela Apple)
echo.
start "" "https://codemagic.io/apps"
start "" "https://appstoreconnect.apple.com/apps/6796102702/testflight/ios"
echo.
echo PASSO 1 — Codemagic (NAO use Rebuild):
echo   Repo: troca-copa-2026
echo   Workflow: Medico de Casa — iOS TestFlight
echo   Branch: main
echo   Start new build (commit 1.0.0+6 precisa estar no GitHub)
echo.
echo PASSO 2 — Quando build 6 aparecer no TestFlight (15-40 min):
echo   Manage Compliance ^> NAO usa criptografia
echo   Internal Testing ^> grupo drlucas ^> Notify Testers
echo.
echo PASSO 3 — iPhone:
echo   App TestFlight (nao Safari) ^> Medico de Casa ^> Instalar
echo.
echo Link publico beta (se ativo):
echo   https://testflight.apple.com/join/tnMrHP5Z
echo.
pause
