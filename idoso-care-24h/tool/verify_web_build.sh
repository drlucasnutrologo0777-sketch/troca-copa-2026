#!/usr/bin/env bash
# Falha o CI se o IPA nao for o app WEB (WebAppScreen + assets web_app/).
set -euo pipefail

EXPECTED_BUILD=$(grep '^version:' pubspec.yaml | sed -E 's/version: .*\+([0-9]+)/\1/')
if [ -z "${EXPECTED_BUILD:-}" ]; then
  echo "ERRO: nao leu build number do pubspec.yaml"
  exit 1
fi

echo "=== Verificar codigo fonte (app WEB, nao Flutter antigo) ==="
grep -q 'WebAppScreen' lib/main.dart || { echo "ERRO: lib/main.dart nao usa WebAppScreen"; exit 1; }
grep -q 'OnboardingGate' lib/main.dart && { echo "ERRO: main.dart ainda referencia OnboardingGate (app antigo)"; exit 1; } || true
grep -q 'HomeShell' lib/main.dart && { echo "ERRO: main.dart ainda referencia HomeShell (app antigo)"; exit 1; } || true
test -f web_app/index.html || { echo "ERRO: web_app/index.html ausente"; exit 1; }
grep -q 'ic24AvaliarDocumentacaoCuidador' web_app/firebase-ic24.js || { echo "ERRO: firebase-ic24.js sem avaliacao de documentacao separada"; exit 1; }
grep -q 'basicSignupComplete' web_app/index.html || { echo "ERRO: cadastro cuidador sem basicSignupComplete"; exit 1; }
grep -q "web_v${EXPECTED_BUILD}" lib/services/web_app_bundle.dart || { echo "ERRO: web_app_bundle stamp nao e web_v${EXPECTED_BUILD}"; exit 1; }
grep -q "Build ${EXPECTED_BUILD}" lib/screens/web_app_screen.dart || { echo "ERRO: WebAppScreen nao aponta build ${EXPECTED_BUILD}"; exit 1; }
test -f web_app/favicon.png || { echo "ERRO: web_app/favicon.png ausente"; exit 1; }
test -f web_app/logo.png || { echo "ERRO: web_app/logo.png ausente"; exit 1; }
grep -q 'ic24NormalizeUploadFile' web_app/ic24-curriculo.js || { echo "ERRO: HEIC normalize ausente em ic24-curriculo.js"; exit 1; }
echo "OK: fonte aponta para WebAppScreen + web_app/ build ${EXPECTED_BUILD}"

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
  echo "CFBundleVersion no IPA: ${BUILD_NUM:-desconhecido} (esperado ${EXPECTED_BUILD})"
  if [ "${BUILD_NUM:-}" != "${EXPECTED_BUILD}" ]; then
    echo "ERRO: CFBundleVersion esperado ${EXPECTED_BUILD}, obtido ${BUILD_NUM:-vazio}"
    exit 1
  fi
  if [ "${BUILD_NUM:-0}" -le 53 ]; then
    echo "ERRO: CFBundleVersion ${BUILD_NUM} nao e maior que 53 (ultimo upload TestFlight)"
    exit 1
  fi
  echo "OK: IPA contem web_app/index.html e CFBundleVersion ${BUILD_NUM}"
fi
