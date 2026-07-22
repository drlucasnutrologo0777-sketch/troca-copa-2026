#!/usr/bin/env bash
# Falha o CI se pubspec, Version.xcconfig e BO_IOS_BUILD.txt divergirem.
set -euo pipefail

PUBSPEC_LINE=$(grep '^version:' pubspec.yaml)
PUBSPEC_NAME=$(echo "$PUBSPEC_LINE" | sed -E 's/version: ([^+]+)\+.*/\1/')
PUBSPEC_NUM=$(echo "$PUBSPEC_LINE" | sed -E 's/version: .*\+([0-9]+)/\1/')

test -f ios/Flutter/Version.xcconfig || { echo "ERRO: ios/Flutter/Version.xcconfig ausente"; exit 1; }
XC_NAME=$(grep '^FLUTTER_BUILD_NAME=' ios/Flutter/Version.xcconfig | cut -d= -f2)
XC_NUM=$(grep '^FLUTTER_BUILD_NUMBER=' ios/Flutter/Version.xcconfig | cut -d= -f2)

test -f ios/BO_IOS_BUILD.txt || { echo "ERRO: ios/BO_IOS_BUILD.txt ausente"; exit 1; }
TXT_NUM=$(tr -d ' \n\r' < ios/BO_IOS_BUILD.txt)

echo "pubspec: ${PUBSPEC_NAME}+${PUBSPEC_NUM}"
echo "Version.xcconfig: ${XC_NAME}/${XC_NUM}"
echo "BO_IOS_BUILD.txt: ${TXT_NUM}"

if [ "$XC_NAME" != "$PUBSPEC_NAME" ] || [ "$XC_NUM" != "$PUBSPEC_NUM" ]; then
  echo "ERRO: Version.xcconfig (${XC_NAME}/${XC_NUM}) != pubspec (${PUBSPEC_NAME}/${PUBSPEC_NUM})"
  exit 1
fi
if [ "$TXT_NUM" != "$PUBSPEC_NUM" ]; then
  echo "ERRO: BO_IOS_BUILD.txt (${TXT_NUM}) != pubspec (+${PUBSPEC_NUM})"
  exit 1
fi
if [ -n "${BO_BUILD_NUMBER:-}" ] && [ "$BO_BUILD_NUMBER" != "$PUBSPEC_NUM" ]; then
  echo "ERRO: BO_BUILD_NUMBER (${BO_BUILD_NUMBER}) != pubspec (+${PUBSPEC_NUM})"
  exit 1
fi
if [ "$PUBSPEC_NUM" -le 6 ]; then
  echo "ERRO: build ${PUBSPEC_NUM} <= 6 — TestFlight DUPLICATE (build 6 ja enviado)"
  exit 1
fi

echo "OK: build ${PUBSPEC_NAME}+${PUBSPEC_NUM} alinhado"
