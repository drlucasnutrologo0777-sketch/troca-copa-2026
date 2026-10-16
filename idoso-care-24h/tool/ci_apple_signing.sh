#!/usr/bin/env bash
# Idoso Care — assinatura iOS Codemagic (fetch-signing-files; sem --team-id na CLI).
set -euo pipefail

echo "=== ci_apple_signing.sh v7 (fetch App Store Connect, team pela chave API) ==="

BUNDLE_ID="${BUNDLE_ID:-com.idosocare24h.app}"
EXPORT_PLIST="ios/codemagic_signing/ExportOptions.plist"

if [ -f "$EXPORT_PLIST" ]; then
  /usr/libexec/PlistBuddy -c "Delete :teamID" "$EXPORT_PLIST" 2>/dev/null || true
fi

API_KEY="${APP_STORE_CONNECT_API_KEY_PATH:-ios/codemagic_signing/AuthKey_VHR75L74MJ.p8}"
[ -f "../ios/codemagic_signing/AuthKey_VHR75L74MJ.p8" ] && API_KEY="../ios/codemagic_signing/AuthKey_VHR75L74MJ.p8"
[ -f "ios/codemagic_signing/AuthKey_VHR75L74MJ.p8" ] && API_KEY="ios/codemagic_signing/AuthKey_VHR75L74MJ.p8"

if [ ! -f "$API_KEY" ]; then
  echo "ERRO: AuthKey .p8 nao encontrada (esperado ../ios/codemagic_signing/ no Codemagic)."
  exit 1
fi

PEM="${CERTIFICATE_PRIVATE_KEY_PATH:-../ios/codemagic_signing/ios_distribution_private_key.pem}"
[ -f "$PEM" ] || PEM="ios/codemagic_signing/ios_distribution_private_key.pem"

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
  P12="../ios/codemagic_signing/distribution.p12"
  [ -f "$P12" ] || P12="ios/codemagic_signing/distribution.p12"
  keychain initialize
  if [ -f "$P12" ]; then
    keychain add-certificates \
      --certificate "$P12" \
      --certificate-password "${CM_CERTIFICATE_PASSWORD:?}"
  fi
  if [ -n "$PROV_TEAM" ] && [ -f "$EXPORT_PLIST" ]; then
    /usr/libexec/PlistBuddy -c "Add :teamID string ${PROV_TEAM}" "$EXPORT_PLIST" 2>/dev/null \
      || /usr/libexec/PlistBuddy -c "Set :teamID ${PROV_TEAM}" "$EXPORT_PLIST" 2>/dev/null || true
  fi
  /usr/libexec/PlistBuddy -c "Set :provisioningProfiles:${BUNDLE_ID} ${UUID}" "$EXPORT_PLIST" || true
  xcode-project use-profiles --project ios/Runner.xcodeproj || true
  echo "Perfil manual OK (team ${PROV_TEAM:-?})."
}

if [ -n "$PROV" ]; then
  install_manual_profile "$PROV"
  exit 0
fi

if [ ! -f "$PEM" ]; then
  echo "ERRO: falta ios_distribution_private_key.pem em ../ios/codemagic_signing/"
  echo "Ou coloque app_store.mobileprovision em idoso-care-24h/ios/codemagic_signing/"
  exit 1
fi

echo "fetch-signing-files ${BUNDLE_ID} (mesmo fluxo Medico de Casa / Babá ON)..."
export CERTIFICATE_PRIVATE_KEY="$(cat "$PEM")"
keychain initialize
app-store-connect fetch-signing-files "$BUNDLE_ID" \
  --type IOS_APP_STORE \
  --create \
  --certificate-key=@file:"$PEM" \
  --verbose
keychain add-certificates
xcode-project use-profiles --project ios/Runner.xcodeproj
echo "Fetch OK — perfil e certificado instalados."
