"""Cria Bundle ID + app no App Store Connect (Medico de Casa)."""
from __future__ import annotations

import json
import os
import sys
import time

import jwt
import requests

ISSUER_ID = os.environ.get("APP_STORE_CONNECT_ISSUER_ID", "b681d77e-4c5b-4154-b3e4-962dab155c2d")
KEY_ID = os.environ.get("APP_STORE_CONNECT_KEY_IDENTIFIER", "VHR75L74MJ")
KEY_PATH = os.environ.get(
    "APP_STORE_CONNECT_API_KEY_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "ios", "codemagic_signing", "AuthKey_VHR75L74MJ.p8"),
)
BUNDLE_ID = os.environ.get("BUNDLE_ID", "com.medicodecasa.app")
APP_NAME = os.environ.get("ASC_APP_NAME", "Medico de Casa")
SKU = os.environ.get("ASC_SKU", "medicodecasa001")
LOCALE = os.environ.get("ASC_LOCALE", "pt-BR")
BASE = "https://api.appstoreconnect.apple.com/v1"


def token() -> str:
    with open(KEY_PATH, encoding="utf-8") as f:
        private_key = f.read()
    now = int(time.time())
    return jwt.encode(
        {"iss": ISSUER_ID, "exp": now + 1200, "aud": "appstoreconnect-v1"},
        private_key,
        algorithm="ES256",
        headers={"kid": KEY_ID, "typ": "JWT"},
    )


def headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {token()}", "Content-Type": "application/json"}


def get_json(url: str, **params) -> dict:
    r = requests.get(url, headers=headers(), params=params or None, timeout=60)
    if r.status_code >= 400:
        print(r.status_code, r.text, file=sys.stderr)
        r.raise_for_status()
    return r.json()


def post_json(url: str, payload: dict) -> dict:
    r = requests.post(url, headers=headers(), json=payload, timeout=60)
    if r.status_code >= 400:
        print(r.status_code, r.text, file=sys.stderr)
        r.raise_for_status()
    return r.json()


def find_app() -> dict | None:
    data = get_json(f"{BASE}/apps", **{"filter[bundleId]": BUNDLE_ID, "limit": 10})
    apps = data.get("data", [])
    return apps[0] if apps else None


def find_bundle_id() -> dict | None:
    data = get_json(f"{BASE}/bundleIds", **{"filter[identifier]": BUNDLE_ID, "limit": 10})
    items = data.get("data", [])
    return items[0] if items else None


def ensure_bundle_id() -> str:
    existing = find_bundle_id()
    if existing:
        print(f"Bundle ID ja existe: {BUNDLE_ID} (id={existing['id']})")
        return existing["id"]

    print(f"Criando Bundle ID {BUNDLE_ID} ...")
    created = post_json(
        f"{BASE}/bundleIds",
        {
            "data": {
                "type": "bundleIds",
                "attributes": {
                    "identifier": BUNDLE_ID,
                    "name": APP_NAME,
                    "platform": "IOS",
                },
            }
        },
    )
    bid = created["data"]["id"]
    print(f"Bundle ID criado: {bid}")
    return bid


def ensure_app(bundle_resource_id: str) -> str:
    existing = find_app()
    if existing:
        apple_id = existing["id"]
        print(f"App ja existe: {APP_NAME} appleId={apple_id} bundle={BUNDLE_ID}")
        return apple_id

    print(f"Criando app App Store Connect: {APP_NAME} ...")
    created = post_json(
        f"{BASE}/apps",
        {
            "data": {
                "type": "apps",
                "attributes": {
                    "name": APP_NAME,
                    "sku": SKU,
                    "primaryLocale": LOCALE,
                },
                "relationships": {
                    "bundleId": {
                        "data": {"type": "bundleIds", "id": bundle_resource_id}
                    }
                },
            }
        },
    )
    apple_id = created["data"]["id"]
    print(f"App criado: appleId={apple_id}")
    return apple_id


def main() -> int:
    if not os.path.isfile(KEY_PATH):
        print(f"ERRO: AuthKey nao encontrada: {KEY_PATH}", file=sys.stderr)
        return 1
    try:
        bundle_rid = ensure_bundle_id()
        apple_id = ensure_app(bundle_rid)
        print("ASC_APPLE_ID=" + apple_id)
        return 0
    except requests.HTTPError:
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
