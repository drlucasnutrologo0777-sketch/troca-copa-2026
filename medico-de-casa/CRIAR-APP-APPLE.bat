@echo off
title Medico de Casa — criar app na Apple
echo.
echo ========== MEDICO DE CASA — APP STORE CONNECT ==========
echo.
echo Bundle ID ja existe: com.medicodecasa.app
echo Falta SO criar o app no App Store Connect (2 minutos).
echo.
echo Preencha EXATAMENTE:
echo   Nome:     Medico de Casa
echo   Bundle:   com.medicodecasa.app
echo   SKU:      medicodecasa001
echo   Idioma:   Portugues (Brasil)
echo.
echo Abrindo App Store Connect...
start https://appstoreconnect.apple.com/apps
echo.
echo Depois de criar, rode de novo no Codemagic:
echo   Medico de Casa — iOS TestFlight
echo.
pause
