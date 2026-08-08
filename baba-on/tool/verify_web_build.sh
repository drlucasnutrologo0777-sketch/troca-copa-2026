#!/usr/bin/env bash
set -euo pipefail
grep -q 'BabaOnApp' lib/main.dart
grep -q 'iOS build 1.0.0+16' web_app/index.html
grep -q 'bo_taxa_manutencao' web_app/ic24-cobranca.js
grep -q 'Ver taxa pendente' web_app/index.html
grep -q 'bo-geo.js' web_app/index.html
grep -q 'ic24BootNav' web_app/index.html
grep -q 'EagerGestureRecognizer' lib/screens/web_app_screen.dart
grep -q 'btnWelcomeEntrar' web_app/index.html
test -f web_app/bo-geo.js
echo "OK Baba ON web bundle +16"
