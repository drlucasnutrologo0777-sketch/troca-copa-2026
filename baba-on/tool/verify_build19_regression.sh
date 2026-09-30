#!/usr/bin/env bash
# Build 19 — checks além do 16 + web bundle (rodar após verify_build16_parity + verify_web_build).
set -euo pipefail
grep -q 'autoApproved' web_app/ic24-curriculo.js
grep -q 'ic24-compliance.js' web_app/index.html
grep -q 'ic24-destino.js' web_app/index.html
grep -q 'IC24_DESTINO_MIN_DIAS_ANTECEDENCIA' web_app/ic24-destino.js
grep -q 'ic24CepDigits' web_app/ic24-destino.js
grep -q 'mae-babas-destino' web_app/index.html
grep -q 'Ofertas — babás de outros lugares' web_app/index.html
grep -q 'caregiver_destination_availability' firebase-deploy/firestore.rules
grep -q 'matchedFamilyId' firebase-deploy/firestore.rules
grep -q 'ic24FecharDestinoSeOfertaMatch' web_app/ic24-destino.js
test -f tool/audit_firestore_destino.mjs
grep -q 'ic24ExcluirTrabalhoOutroLugar' web_app/ic24-destino.js
grep -q 'platform :ios, '\''15.0'\''' ios/Podfile
test -f tool/test_destino_familia_match.mjs
echo "OK build 19 pronto Codemagic"
