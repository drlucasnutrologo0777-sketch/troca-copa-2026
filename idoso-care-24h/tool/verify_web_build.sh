#!/usr/bin/env bash
# Falha o CI se o IPA nao for o app WEB (WebAppScreen + assets web_app/).
set -euo pipefail

echo "=== Verificar codigo fonte (app WEB, nao Flutter antigo) ==="
grep -q 'WebAppScreen' lib/main.dart || { echo "ERRO: lib/main.dart nao usa WebAppScreen"; exit 1; }
grep -q 'OnboardingGate' lib/main.dart && { echo "ERRO: main.dart ainda referencia OnboardingGate (app antigo)"; exit 1; } || true
grep -q 'HomeShell' lib/main.dart && { echo "ERRO: main.dart ainda referencia HomeShell (app antigo)"; exit 1; } || true
test -f web_app/index.html || { echo "ERRO: web_app/index.html ausente"; exit 1; }
echo "OK: fonte aponta para WebAppScreen + web_app/"

if [ "${1:-}" = "--ipa" ]; then
  IPA="${2:-}"
  if [ -z "$IPA" ] || [ ! -f "$IPA" ]; then
    echo "ERRO: informe caminho do .ipa"
    exit 1
  fi
  echo "=== Verificar IPA: $IPA ==="
  unzip -l "$IPA" | grep -q 'flutter_assets' || { echo "ERRO: flutter_assets ausente"; exit 1; }
  MANIFEST=$(unzip -p "$IPA" 'Payload/*.app/Frameworks/App.framework/flutter_assets/AssetManifest.json' 2>/dev/null || true)
  echo "$MANIFEST" | grep -q 'web_app/index.html' || {
    echo "ERRO: web_app/index.html nao esta no AssetManifest do IPA"
    exit 1
  }
  echo "OK: IPA contem web_app/index.html"
fi
