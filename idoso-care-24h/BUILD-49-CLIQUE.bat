@echo off
echo Build 49: 2.0.0+49 — IAP ic24_taxa_manutencao submetido para revisao Apple.
echo.
echo ANTES DO BUILD: App Store Connect ^> IAP ^> ic24_taxa_manutencao ^> screenshot + Ready to Submit
echo Screenshot: Desktop\Idoso Care IAP Revisao.png
echo.
start "" "https://appstoreconnect.apple.com/apps/6784357547/distribution/iaps"
start "" "https://codemagic.io/apps"
start "" "https://appstoreconnect.apple.com/apps/6784357547/testflight/ios"
echo.
echo 1. Suba IAP no App Store Connect (IAP-SUBMISSAO-APP-STORE.txt)
echo 2. git push origin main
echo 3. Codemagic: Idoso Care 24H — iOS TestFlight
echo 4. Versao 1.0: marque IAP + build 49 ^> Enviar para revisao
pause
