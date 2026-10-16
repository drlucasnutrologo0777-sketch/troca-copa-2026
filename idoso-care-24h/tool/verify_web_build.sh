#!/usr/bin/env bash
# Falha o CI se o IPA nao for o app WEB (WebAppScreen + assets web_app/).
set -euo pipefail

echo "=== Verificar codigo fonte (app WEB, nao Flutter antigo) ==="
grep -q 'WebAppScreen' lib/main.dart || { echo "ERRO: lib/main.dart nao usa WebAppScreen"; exit 1; }
grep -q 'OnboardingGate' lib/main.dart && { echo "ERRO: main.dart ainda referencia OnboardingGate (app antigo)"; exit 1; } || true
grep -q 'HomeShell' lib/main.dart && { echo "ERRO: main.dart ainda referencia HomeShell (app antigo)"; exit 1; } || true
test -f web_app/index.html || { echo "ERRO: web_app/index.html ausente"; exit 1; }
grep -q 'firebase-auth-compat.js' web_app/curriculo.html || { echo "ERRO: curriculo.html sem firebase-auth-compat.js"; exit 1; }
grep -q 'requireAuth: false' web_app/ic24-curriculo.js || { echo "ERRO: ic24CarregarCurriculoPorToken deve usar requireAuth:false"; exit 1; }
grep -q 'ic24MostrarErroCurriculo' web_app/curriculo.html || { echo "ERRO: curriculo.html sem handler de erro"; exit 1; }
grep -q 'ic24PreviewFotoPerfil' web_app/ic24-curriculo.js || { echo "ERRO: helper foto perfil ausente"; exit 1; }
grep -q 'Protótipo Web' web_app/index.html && { echo "ERRO: badge Protótipo Web ainda presente (Apple rejeita)"; exit 1; } || true
grep -q 'id="pix-pay"' web_app/index.html && { echo "ERRO: tela pix-pay (Troca Copa) no Idoso Care — remover"; exit 1; } || true
grep -q 'PIX para liberar chat' web_app/index.html && { echo "ERRO: PIX R\$ 0,50 chat no Idoso Care — remover"; exit 1; } || true
grep -q 'ic24-marketplace-lifecycle.js' web_app/index.html || { echo "ERRO: index.html sem ic24-marketplace-lifecycle.js"; exit 1; }
grep -q 'cuidador-propostas' web_app/index.html || { echo "ERRO: tela cuidador-propostas ausente"; exit 1; }
grep -q 'iOS build 2.0.3+73' web_app/index.html || { echo "ERRO: comentario build 2.0.3+73 ausente no index.html"; exit 1; }
test -f web_app/ic24-marketplace-lifecycle.js || { echo "ERRO: ic24-marketplace-lifecycle.js ausente"; exit 1; }
grep -q 'ic24_v73_p3_domain_server_grade9' lib/services/web_app_bundle.dart || { echo "ERRO: bundleStamp desatualizado"; exit 1; }
grep -q 'ic24-domain.js' web_app/index.html || { echo "ERRO: ic24-domain.js ausente"; exit 1; }
grep -q 'ic24-match-notify.js' web_app/index.html || { echo "ERRO: match notify ausente"; exit 1; }
test -f web_app/ic24-match-notify.js || { echo "ERRO: ic24-match-notify.js ausente"; exit 1; }
echo "OK: fonte aponta para WebAppScreen + web_app/ (build 73 marketplace)"

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
  echo "OK: IPA contem web_app/index.html (Flutter usa AssetManifest.bin, nao .json)"
fi
