@echo off
start "" "https://codemagic.io/apps"
echo.
echo BUILD 8 — Babá ON iOS TestFlight (lancamento)
echo pubspec: 1.0.0+8
echo.
echo ANTES DO ENVIO APPLE (ordem):
echo   1. node scripts\seed_review_iap_demo.mjs
echo   2. firebase-deploy\DEPLOY-CLIQUE.bat
echo   3. App Store Connect: app GRATIS + IAP bo_taxa_manutencao na versao 1.0 build 8
echo   4. Git push main ^> Codemagic dispara "Baba ON — iOS TestFlight"
echo.
echo Checklist: SUBMISSAO-APP-STORE.txt
echo Notas revisor: IAP-REVIEW-NOTAS.txt
echo Web: https://baba-on-3634a.web.app
echo.
pause
