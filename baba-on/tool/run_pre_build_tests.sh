#!/usr/bin/env bash
set -eu
cd "$(dirname "$0")/.."
bash tool/verify_build20_regression.sh
bash tool/verify_build_number.sh
node tool/test_destino_familia_match.mjs
node tool/audit_firestore_destino.mjs
echo "OK run_pre_build_tests — build 20"
