#!/usr/bin/env bash
# Idoso Care — assinatura iOS Codemagic (contorna Team ID G279FN9YW7 errado na UI).
set -euo pipefail

echo "=== ci_apple_signing.sh BUILD FIX v5 (G279 p12 bloqueado — perfil obrigatorio) ==="

LEGACY_BAD_TEAM="G279FN9YW7"
BUNDLE_ID="${BUNDLE_ID:-com.idosocare24h.app}"
EXPORT_PLIST="ios/codemagic_signing/ExportOptions.plist"

# Time antigo copiado de outros apps — NAO e menu do Codemagic
if [ -f "$EXPORT_PLIST" ]; then
  CUR=$(/usr/libexec/PlistBuddy -c "Print :teamID" "$EXPORT_PLIST" 2>/dev/null || true)
  if [ "$CUR" = "$LEGACY_BAD_TEAM" ]; then
    /usr/libexec/PlistBuddy -c "Delete :teamID" "$EXPORT_PLIST" 2>/dev/null || true
  fi
fi
P12="../ios/codemagic_signing/distribution.p12"
[ -f "$P12" ] || P12="ios/codemagic_signing/distribution.p12"
PEM="${CERTIFICATE_PRIVATE_KEY_PATH:-../ios/codemagic_signing/ios_distribution_private_key.pem}"
CERT_IS_LEGACY=0
API_KEY="${APP_STORE_CONNECT_API_KEY_PATH:-ios/codemagic_signing/AuthKey_VHR75L74MJ.p8}"

[ -f "../ios/codemagic_signing/AuthKey_VHR75L74MJ.p8" ] && API_KEY="../ios/codemagic_signing/AuthKey_VHR75L74MJ.p8"
[ -f "ios/codemagic_signing/AuthKey_VHR75L74MJ.p8" ] && API_KEY="ios/codemagic_signing/AuthKey_VHR75L74MJ.p8"

export APP_STORE_CONNECT_PRIVATE_KEY="$(cat "$API_KEY")"

# Perfil commitado = zero API Apple (coloque ios/codemagic_signing/app_store.mobileprovision)
PROV="ios/codemagic_signing/app_store.mobileprovision"

team_from_cert() {
  local t=""
  if [ -f "$P12" ]; then
    t=$(openssl pkcs12 -in "$P12" -passin "pass:${CM_CERTIFICATE_PASSWORD}" -clcerts -nokeys 2>/dev/null \
      | openssl x509 -noout -subject 2>/dev/null \
      | sed -n 's/.*OU=\([A-Z0-9]\{10\}\).*/\1/p' | head -1 || true)
  fi
  if [ -z "$t" ] && [ -f "$PEM" ]; then
    t=$(openssl x509 -in "$PEM" -noout -subject 2>/dev/null \
      | sed -n 's/.*OU=\([A-Z0-9]\{10\}\).*/\1/p' | head -1 || true)
  fi
  echo "$t"
}

TEAM="$(team_from_cert)"
if [ "$TEAM" = "$LEGACY_BAD_TEAM" ]; then
  CERT_IS_LEGACY=1
  echo "AVISO: certificado .p12 e do time antigo ${LEGACY_BAD_TEAM} — NAO usar na API Apple."
  TEAM=""
fi
echo "Team ID do certificado (se valido): ${TEAM:-nao usar p12 na API}"

unset APP_STORE_CONNECT_TEAM_ID APPLE_TEAM_ID CM_TEAM_ID TEAM_ID 2>/dev/null || true

keychain initialize
if [ "$CERT_IS_LEGACY" = "0" ] && [ -f "$P12" ]; then
  keychain add-certificates \
    --certificate "$P12" \
    --certificate-password "${CM_CERTIFICATE_PASSWORD:?}"
fi

if [ -f "$PROV" ]; then
  echo "Usando app_store.mobileprovision do repo (sem fetch Apple API)."
  UUID=$(security cms -D -i "$PROV" | plutil -extract UUID raw -)
  PROV_TEAM=$(security cms -D -i "$PROV" | plutil -extract TeamIdentifier.0 raw - 2>/dev/null || true)
  mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
  cp "$PROV" "$HOME/Library/MobileDevice/Provisioning Profiles/${UUID}.mobileprovision"
  if [ -n "$PROV_TEAM" ] && [ -f "$EXPORT_PLIST" ]; then
    /usr/libexec/PlistBuddy -c "Add :teamID string ${PROV_TEAM}" "$EXPORT_PLIST" 2>/dev/null \
      || /usr/libexec/PlistBuddy -c "Set :teamID ${PROV_TEAM}" "$EXPORT_PLIST" 2>/dev/null || true
  fi
  /usr/libexec/PlistBuddy -c "Set :provisioningProfiles:${BUNDLE_ID} ${UUID}" "$EXPORT_PLIST" || true
  xcode-project use-profiles --project ios/Runner.xcodeproj || true
  echo "Perfil manual OK."
  exit 0
fi

run_fetch() {
  local extra_team="$1"
  local use_pem="$2"
  local args=(fetch-signing-files "$BUNDLE_ID" --type IOS_APP_STORE --create --verbose)
  if [ -n "$extra_team" ]; then
    args+=(--team-id="$extra_team")
  fi
  if [ "$use_pem" = "1" ] && [ -f "$PEM" ]; then
    export CERTIFICATE_PRIVATE_KEY="$(cat "$PEM")"
    app-store-connect "${args[@]}" --certificate-key=@file:"$PEM"
  else
    unset CERTIFICATE_PRIVATE_KEY 2>/dev/null || true
    app-store-connect "${args[@]}"
  fi
}

if [ "$CERT_IS_LEGACY" = "1" ] && [ ! -f "$PROV" ]; then
  echo "ERRO: falta app_store.mobileprovision (com.idosocare24h.app) no GitHub."
  echo "O .p12 no repo e time G279 — a API sempre da 403 ate voce subir o perfil."
  echo "Link: https://developer.apple.com/account/resources/profiles/list"
  exit 1
fi

echo "Buscando perfil App Store para ${BUNDLE_ID}..."
if run_fetch "" "0"; then
  keychain add-certificates 2>/dev/null || true
  xcode-project use-profiles --project ios/Runner.xcodeproj
  echo "Fetch OK (team automatico pela chave API)."
  exit 0
fi

if [ -n "$TEAM" ]; then
  echo "Tentando de novo com team-id do certificado..."
  if run_fetch "$TEAM" "1"; then
    keychain add-certificates 2>/dev/null || true
    xcode-project use-profiles --project ios/Runner.xcodeproj
    echo "Fetch OK (team certificado)."
    exit 0
  fi
fi

echo ""
echo "FALHOU (403). NAO precisa achar G279 no Codemagic — estava no arquivo ExportOptions.plist do GitHub."
echo "LEIGO — faca isto:"
echo "  1) developer.apple.com -> Profiles -> App Store -> com.idosocare24h.app -> Download"
echo "  2) Renomeie para app_store.mobileprovision"
echo "  3) Copie para idoso-care-24h/ios/codemagic_signing/"
echo "  4) GitHub Desktop -> Commit + Push -> Codemagic Start new build"
exit 1
