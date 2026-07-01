@echo off
echo Build 46: 2.0.0+46 — mesmas configs do 45 (workflow idoso-care-ios, assinatura, verify_web_build).
echo Faca push do main antes: git push origin main
echo.
start "" "https://codemagic.io/apps"
start "" "https://github.com/drlucasnutrologo0777-sketch/troca-copa-2026"
start "" "https://appstoreconnect.apple.com/apps/BABAON_ASC/testflight/ios"
echo.
echo Codemagic: troca-copa-2026 ^> Start new build ^> **Babá ON — iOS TestFlight** ^> branch main
pause
