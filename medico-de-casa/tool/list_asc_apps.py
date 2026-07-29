import os, time, jwt, requests

KEY_PATH = os.environ.get(
    "APP_STORE_CONNECT_API_KEY_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "ios", "codemagic_signing", "AuthKey_VHR75L74MJ.p8"),
)
ISSUER = os.environ.get("APP_STORE_CONNECT_ISSUER_ID", "b681d77e-4c5b-4154-b3e4-962dab155c2d")
KID = os.environ.get("APP_STORE_CONNECT_KEY_IDENTIFIER", "VHR75L74MJ")

key = open(KEY_PATH, encoding="utf-8").read()
tok = jwt.encode(
    {"iss": ISSUER, "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
    key,
    algorithm="ES256",
    headers={"kid": KID, "typ": "JWT"},
)
h = {"Authorization": "Bearer " + tok}

apps = requests.get("https://api.appstoreconnect.apple.com/v1/apps?limit=200", headers=h, timeout=60).json()["data"]
print("=== APPS NO APP STORE CONNECT ===")
for a in apps:
    at = a["attributes"]
    print(
        f"{at.get('name')} | bundleId={at.get('bundleId')} | appleId={a['id']} | sku={at.get('sku')}"
    )

bundles = requests.get("https://api.appstoreconnect.apple.com/v1/bundleIds?limit=200", headers=h, timeout=60).json()["data"]
print("\n=== BUNDLE IDS (medico/casa) ===")
for b in bundles:
    ident = b["attributes"].get("identifier", "")
    if "medico" in ident.lower() or "casa" in ident.lower():
        print(f"{ident} | id={b['id']} | name={b['attributes'].get('name')}")
