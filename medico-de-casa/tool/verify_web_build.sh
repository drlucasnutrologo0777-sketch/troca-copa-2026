#!/usr/bin/env bash
# Falha o CI se o IPA nao for o app WEB (WebAppScreen + assets web_app/).
set -euo pipefail

echo "=== Verificar codigo fonte Medico de Casa ==="
grep -q 'WebAppScreen' lib/main.dart || { echo "ERRO: lib/main.dart nao usa WebAppScreen"; exit 1; }
grep -q 'OnboardingGate' lib/main.dart && { echo "ERRO: main.dart ainda referencia OnboardingGate (app antigo)"; exit 1; } || true
grep -q 'HomeShell' lib/main.dart && { echo "ERRO: main.dart ainda referencia HomeShell (app antigo)"; exit 1; } || true
test -f web_app/index.html || { echo "ERRO: web_app/index.html ausente"; exit 1; }
grep -q 'ic24_taxa_manutencao' web_app/ic24-cobranca.js || { echo "ERRO: IAP ic24_taxa_manutencao ausente"; exit 1; }
grep -q 'ic24SalvarCuidador' web_app/firebase-mh.js || { echo "ERRO: firebase-mh.js sem ic24SalvarCuidador"; exit 1; }
grep -q 'finalizarMedicoHome' web_app/mh-app.js || { echo "ERRO: mh-app.js sem finalizarMedicoHome"; exit 1; }
grep -q 'Protótipo Web' web_app/index.html && { echo "ERRO: badge Protótipo Web (Apple rejeita)"; exit 1; } || true
BUILD_STAMP=$(grep '^version:' pubspec.yaml | sed 's/version: /Medico de Casa iOS build /')
grep -q "$BUILD_STAMP" web_app/index.html || {
  echo "ERRO: build stamp incorreto — esperado comentario: $BUILD_STAMP"
  exit 1
}
echo "OK: fonte aponta para WebAppScreen + web_app/ Medico de Casa ($BUILD_STAMP)"

if [ "${1:-}" = "--ipa" ]; then
  IPA="${2:-}"
  if [ -z "$IPA" ] || [ ! -f "$IPA" ]; then
    echo "ERRO: informe caminho do .ipa"
    exit 1
  fi
  echo "=== Verificar IPA: $IPA ==="
  LISTING=$(unzip -l "$IPA")
  echo "$LISTING" | grep -q 'flutter_assets' || { echo "ERRO: flutter_assets ausente no IPA"; exit 1; }
  echo "$LISTING" | grep -q 'web_app/index.html' || {
    echo "ERRO: web_app/index.html nao encontrado dentro do IPA"
    exit 1
  }
  echo "$LISTING" | grep -q 'flutter_inappwebview' || {
    echo "ERRO: flutter_inappwebview ausente no IPA"
    exit 1
  }
  BUILD_NUM=$(unzip -p "$IPA" 'Payload/Runner.app/Info.plist' | plutil -extract CFBundleVersion raw - 2>/dev/null || true)
  echo "CFBundleVersion no IPA: ${BUILD_NUM:-desconhecido}"
  echo "OK: IPA contem web_app/index.html"
fi
