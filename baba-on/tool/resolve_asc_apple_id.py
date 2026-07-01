"""Resolve App Store Connect Apple ID (numeric) from bundle ID."""
from __future__ import annotations

import json
import os
import sys
import time

import jwt
import requests

ISSUER_ID = os.environ.get("APP_STORE_CONNECT_ISSUER_ID", "")
KEY_ID = os.environ.get("APP_STORE_CONNECT_KEY_IDENTIFIER", "")
KEY_PATH = os.environ.get("APP_STORE_CONNECT_API_KEY_PATH", "")
BUNDLE_ID = os.environ.get("BUNDLE_ID", "com.babaon.app")


def token() -> str:
    private_key = open(KEY_PATH, encoding="utf-8").read()
    now = int(time.time())
    return jwt.encode(
        {"iss": ISSUER_ID, "exp": now + 1200, "aud": "appstoreconnect-v1"},
        private_key,
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )


def main() -> int:
    if not all([ISSUER_ID, KEY_ID, KEY_PATH]):
        print("ERRO: defina APP_STORE_CONNECT_ISSUER_ID, KEY_IDENTIFIER e API_KEY_PATH", file=sys.stderr)
        return 1

    headers = {"Authorization": f"Bearer {token()}"}
    response = requests.get(
        "https://api.appstoreconnect.apple.com/v1/apps?limit=200",
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    apps = response.json().get("data", [])

    for app in apps:
        attrs = app.get("attributes", {})
        if attrs.get("bundleId") == BUNDLE_ID:
            print(app["id"])
            return 0

    print(f"ERRO: nenhum app no App Store Connect com bundle ID {BUNDLE_ID}", file=sys.stderr)
    print("", file=sys.stderr)
    print("Apps encontrados na sua conta:", file=sys.stderr)
    for app in apps:
        attrs = app.get("attributes", {})
        print(
            f"  - {attrs.get('name')} | bundleId={attrs.get('bundleId')} | appleId={app['id']}",
            file=sys.stderr,
        )
    print("", file=sys.stderr)
    print(
        "SOLUCAO: App Store Connect -> Apps -> + -> Novo app -> Bundle ID com.babaon.app",
        file=sys.stderr,
    )
    print(
        "NAO use o app 'IDOSO CARE 24 H' se ele estiver com com.drlucasceo07.freteon (nao da para trocar).",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
