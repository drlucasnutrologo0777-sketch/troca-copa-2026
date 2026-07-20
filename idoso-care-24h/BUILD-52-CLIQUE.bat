@echo off
start "" "https://codemagic.io/apps"
echo.
echo BUILD 52 — Idoso Care 24H iOS TestFlight
echo.
echo ANTES DO BUILD (obrigatorio):
echo   node scripts\seed_review_iap_demo.mjs
echo.
echo APP STORE CONNECT (IAP ic24_taxa_manutencao):
echo   1. Nome: Taxa de manutencao  (SEM preco)
echo   2. Descricao: Taxa da plataforma por diaria  (SEM preco)
echo   3. Imagem promocional: IAP-PROMO-IMAGE.png  OU apague a promo
echo   4. Screenshot revisao: IAP-REVIEW-SCREENSHOT.png (tela do app OK)
echo.
echo DEPOIS DO BUILD 52:
echo   Versao 1.0 + build 52 + IAP marcado + Enviar revisao
echo.
pause
