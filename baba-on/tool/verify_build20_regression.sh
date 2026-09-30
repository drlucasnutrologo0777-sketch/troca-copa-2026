#!/usr/bin/env bash
set -eu
cd "$(dirname "$0")/.."
bash tool/verify_build16_parity.sh
bash tool/verify_web_build.sh
grep -q 'IC24_DESTINO_MIN_DIAS_ANTECEDENCIA' web_app/ic24-destino.js
grep -q 'mae-babas-destino' web_app/index.html
grep -q "platform :ios, '16.0'" ios/Podfile
grep -q 'IPHONEOS_DEPLOYMENT_TARGET = 16.0' ios/Runner.xcodeproj/project.pbxproj
echo "OK build 20 pronto Codemagic"
