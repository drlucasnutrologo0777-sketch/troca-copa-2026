#!/usr/bin/env bash
set -eu
grep -q 'BabaOnApp' lib/main.dart
grep -q 'iOS build 1.0.1+22' web_app/index.html
grep -q 'bo_taxa_manutencao' web_app/ic24-cobranca.js
grep -q 'Ver taxa pendente' web_app/index.html
grep -q 'bo-geo.js' web_app/index.html
grep -q 'ic24-destino.js' web_app/index.html
grep -q 'baba-minhas-ofertas' web_app/index.html
grep -q 'ic24BootNav' web_app/index.html
grep -q 'EagerGestureRecognizer' lib/screens/web_app_screen.dart
grep -q 'btnWelcomeEntrar' web_app/index.html
grep -q 'baba_v30_build22' lib/services/web_app_bundle.dart
test -f web_app/bo-geo.js
test -f web_app/ic24-destino.js
echo "OK Baba ON web bundle 1.0.1+22"
