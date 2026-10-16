#!/usr/bin/env bash
# Idoso Care — assinatura iOS Codemagic (API App Store Connect + perfil opcional no repo).
set -euo pipefail

echo "=== ci_apple_signing.sh v6 (CMEDIC Organization / Team G279FN9YW7) ==="

BUNDLE_ID="${BUNDLE_ID:-com.idosocare24h.app}"
APPLE_TEAM="${IC24_APPLE_TEAM_ID:-G279FN9YW7}"
EXPORT_PLIST="ios/codemagic_signing/ExportOptions.plist"

if [ -f "$EXPORT_PLIST" ]; then
  /usr/libexec/PlistBuddy -c "Delete :teamID" "$EXPORT_PLIST" 2>/dev/null || true
fi

API_KEY="${APP_STORE_CONNECT_API_KEY_PATH:-ios/codemagic_signing/AuthKey_VHR75L74MJ.p8}"
[ -f "../ios/codemagic_signing/AuthKey_VHR75L74MJ.p8" ] && API_KEY="../ios/codemagic_signing/AuthKey_VHR75L74MJ.p8"
[ -f "ios/codemagic_signing/AuthKey_VHR75L74MJ.p8" ] && API_KEY="ios/codemagic_signing/AuthKey_VHR75L74MJ.p8"

if [ ! -f "$API_KEY" ]; then
  echo "ERRO: AuthKey .p8 nao encontrada (esperado em ../ios/codemagic_signing/ no Codemagic)."
  exit 1
fi

export APP_STORE_CONNECT_PRIVATE_KEY="$(cat "$API_KEY")"
unset APP_STORE_CONNECT_TEAM_ID APPLE_TEAM_ID CM_TEAM_ID TEAM_ID 2>/dev/null || true

PROV_CANDIDATES=(
  "ios/codemagic_signing/app_store.mobileprovision"
  "../ios/codemagic_signing/app_store.mobileprovision"
)
PROV=""
for p in "${PROV_CANDIDATES[@]}"; do
  if [ -f "$p" ] && security cms -D -i "$p" 2>/dev/null | grep -q "$BUNDLE_ID"; then
    PROV="$p"
    break
  fi
done

install_manual_profile() {
  local profile="$1"
  echo "Usando perfil manual: $profile"
  UUID=$(security cms -D -i "$profile" | plutil -extract UUID raw -)
  PROV_TEAM=$(security cms -D -i "$profile" | plutil -extract TeamIdentifier.0 raw - 2>/dev/null || true)
  mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
  cp "$profile" "$HOME/Library/MobileDevice/Provisioning Profiles/${UUID}.mobileprovision"
  if [ -n "$PROV_TEAM" ] && [ -f "$EXPORT_PLIST" ]; then
    /usr/libexec/PlistBuddy -c "Add :teamID string ${PROV_TEAM}" "$EXPORT_PLIST" 2>/dev/null \
      || /usr/libexec/PlistBuddy -c "Set :teamID ${PROV_TEAM}" "$EXPORT_PLIST" 2>/dev/null || true
  fi
  /usr/libexec/PlistBuddy -c "Set :provisioningProfiles:${BUNDLE_ID} ${UUID}" "$EXPORT_PLIST" || true
  xcode-project use-profiles --project ios/Runner.xcodeproj || true
  echo "Perfil manual OK (team ${PROV_TEAM:-?})."
}

run_fetch() {
  local team_flag=()
  if [ -n "${1:-}" ]; then
    team_flag=(--team-id="$1")
  fi
  echo "fetch-signing-files ${BUNDLE_ID} team=${1:-auto} ..."
  app-store-connect fetch-signing-files "$BUNDLE_ID" \
    --type IOS_APP_STORE \
    --create \
    --verbose \
    "${team_flag[@]}"
}

keychain initialize

if [ -n "$PROV" ]; then
  install_manual_profile "$PROV"
  exit 0
fi

PEM="${CERTIFICATE_PRIVATE_KEY_PATH:-../ios/codemagic_signing/ios_distribution_private_key.pem}"
[ -f "$PEM" ] || PEM="ios/codemagic_signing/ios_distribution_private_key.pem"

echo "Sem .mobileprovision no repo — buscando certificado/perfil via API (Organization)..."
if run_fetch "$APPLE_TEAM"; then
  xcode-project use-profiles --project ios/Runner.xcodeproj
  echo "Fetch OK (team ${APPLE_TEAM})."
  exit 0
fi

if [ -f "$PEM" ]; then
  echo "Tentando fetch com certificate-key PEM..."
  export CERTIFICATE_PRIVATE_KEY="$(cat "$PEM")"
  if app-store-connect fetch-signing-files "$BUNDLE_ID" \
    --type IOS_APP_STORE \
    --create \
    --verbose \
    --team-id="$APPLE_TEAM" \
    --certificate-key=@file:"$PEM"; then
    xcode-project use-profiles --project ios/Runner.xcodeproj
    echo "Fetch OK (PEM + team ${APPLE_TEAM})."
    exit 0
  fi
fi

echo ""
echo "FALHOU assinatura via API."
echo "Conta deve ser Organization CMEDIC (Team ${APPLE_TEAM}) e chave API VHR75L74MJ na mesma equipe."
echo "Alternativa manual (1 arquivo):"
echo "  1) developer.apple.com -> Profiles -> App Store -> ${BUNDLE_ID} -> Download"
echo "  2) Salve como idoso-care-24h/ios/codemagic_signing/app_store.mobileprovision"
echo "  3) Commit + push -> Codemagic build"
exit 1
