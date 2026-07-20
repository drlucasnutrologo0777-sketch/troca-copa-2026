#!/usr/bin/env bash
# Le CFBundleVersion de um .ipa (Payload/*.app/Info.plist — nao assume Runner.app).
set -euo pipefail
IPA="${1:?informe caminho do .ipa}"
if [ ! -f "$IPA" ]; then
  echo "ERRO: IPA nao encontrado: $IPA" >&2
  exit 1
fi
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
unzip -q "$IPA" -d "$TMP"
INFO=$(find "$TMP/Payload" -maxdepth 2 -name Info.plist 2>/dev/null | head -1)
if [ -z "$INFO" ]; then
  echo "ERRO: Info.plist ausente no IPA" >&2
  unzip -l "$IPA" | head -30 >&2 || true
  exit 1
fi
if [ "${2:-}" = "--short" ]; then
  /usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "$INFO"
else
  /usr/libexec/PlistBuddy -c "Print CFBundleVersion" "$INFO"
fi
