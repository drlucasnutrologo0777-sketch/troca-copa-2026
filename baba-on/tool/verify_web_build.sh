#!/usr/bin/env bash
set -euo pipefail
grep -q 'BabaOnApp' lib/main.dart
grep -q 'Babá ON iOS build 1.0.0+1' web_app/index.html
grep -q 'bo_taxa_manutencao' web_app/ic24-cobranca.js
test -f web_app/index.html
echo "OK Babá ON web bundle"
