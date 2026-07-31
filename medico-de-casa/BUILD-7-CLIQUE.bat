@echo off
chcp 65001 >nul
echo.
echo ============================================================
echo  MEDICO DE CASA — BUILD 7 — TestFlight (1.0.0+7)
echo  Fix: foto perfil + documentos no iPhone (galeria nativa)
echo ============================================================
echo.
echo Ultimo upload Apple (ASC): veja ios\ASC_LAST_UPLOADED_BUILD.txt
echo Este build: 7 (sempre MAIOR que o ultimo aceito pela Apple)
echo.
start "" "https://codemagic.io/apps"
start "" "https://appstoreconnect.apple.com/apps/6796102702/testflight/ios"
echo.
echo PASSO 1 — Codemagic (NAO use Rebuild):
echo   Repo: troca-copa-2026
echo   Workflow: Medico de Casa — iOS TestFlight
echo   Branch: main
echo   Start new build (commit 1.0.0+7 precisa estar no GitHub)
echo.
echo PASSO 2 — Upload TestFlight (automatico no workflow):
echo   Quando build 7 aparecer (15-40 min):
echo   Manage Compliance ^> NAO usa criptografia
echo   Internal Testing ^> grupo drlucas ^> Notify Testers
echo.
echo PASSO 3 — iPhone:
echo   App TestFlight (nao Safari) ^> Medico de Casa ^> Instalar build 7
echo   Testar: foto perfil etapa 2 ^> documentos ^> menu principal
echo.
echo Link publico beta:
echo   https://testflight.apple.com/join/tnMrHP5Z
echo.
pause
