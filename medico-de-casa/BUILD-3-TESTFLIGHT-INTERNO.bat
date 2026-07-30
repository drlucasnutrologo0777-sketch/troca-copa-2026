@echo off
chcp 65001 >nul
echo.
echo ============================================================
echo  MEDICO DE CASA — BUILD 4 — TESTFLIGHT INTERNO (sem link)
echo ============================================================
echo.
echo PASSO A — AGORA no App Store Connect (ANTES do build):
echo   https://appstoreconnect.apple.com/apps/6796102702/testflight/ios
echo.
echo   [ ] Build 2: clicar "Remove from Review" se aparecer
echo   [ ] External Testing ^> grupo "teste app" ^> DESLIGAR link publico tnMrHP5Z
echo   [ ] Build 2: remover grupo EXTERNAL do build (manter so Internal)
echo   [ ] Distribution ^> versao 1.0: REMOVER build se estiver selecionado p/ revisao loja
echo.
echo PASSO B — Codemagic:
start "" "https://codemagic.io/apps"
echo   [ ] Start new build ^> "Medico de Casa — iOS TestFlight"
echo   [ ] Commit build 4 (1.0.0+4) precisa estar no GitHub antes
echo.
echo PASSO C — Quando build 4 aparecer no TestFlight (15-40 min):
echo   [ ] Clicar no build 4 ^> Manage Compliance ^> NAO usa criptografia
echo   [ ] Groups: adicionar SO "drlucas" (Internal). NAO adicionar External.
echo   [ ] NAO clicar Submit for Beta Review
echo   [ ] Testers ^> Internal ^> drlucas ^> Notify Testers
echo.
echo PASSO D — iPhone (NAO abrir link testflight.apple.com/join/...):
echo   [ ] Ajustes ^> Apple ID = drlucasnutrologo0777@icloud.com
echo   [ ] Abrir app TestFlight (nao Safari)
echo   [ ] Puxar lista para baixo ^> Medico de Casa ^> Instalar
echo.
echo PLANO B (se TestFlight continuar falhando):
echo   Codemagic ^> "Medico de Casa — iOS Ad Hoc"
echo   Variavel IPHONE_UDID = UDID do seu iPhone (ver abaixo)
echo   Baixar .ipa do build ^> instalar com Sideloadly (Windows)
echo   https://sideloadly.io
echo.
echo Como achar UDID do iPhone:
echo   Cabo USB no PC ^> iTunes ou 3uTools, OU
echo   Ajustes ^> Geral ^> Informacoes ^> toque em "Numero do modelo" ate aparecer UDID
echo.
pause
