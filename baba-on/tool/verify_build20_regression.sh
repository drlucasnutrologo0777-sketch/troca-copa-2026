#!/usr/bin/env bash
# Build 20 — paridade 16 + destino + iOS 16 CocoaPods.
set -euo pipefail
bash tool/verify_build16_parity.sh
bash tool/verify_web_build.sh
grep -q 'autoApproved' web_app/ic24-curriculo.js
grep -q 'ic24-compliance.js' web_app/index.html
grep -q 'IC24_DESTINO_MIN_DIAS_ANTECEDENCIA' web_app/ic24-destino.js
grep -q 'mae-babas-destino' web_app/index.html
grep -q 'Ofertas — babás de outros lugares' web_app/index.html
grep -q 'ic24FecharDestinoSeOfertaMatch' web_app/ic24-destino.js
grep -q 'matchedFamilyId' firebase-deploy/firestore.rules
grep -q "platform :ios, '16.0'" ios/Podfile
grep -q 'IPHONEOS_DEPLOYMENT_TARGET = 16.0' ios/Runner.xcodeproj/project.pbxproj
test -f tool/audit_firestore_destino.mjs
test -f tool/test_destino_familia_match.mjs
echo "OK build 20 pronto Codemagic"
