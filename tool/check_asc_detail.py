"""Detalhes App Store Connect — builds, versoes, submissoes."""
import time
import jwt
import requests

KEY_PATH = r"ios/codemagic_signing/AuthKey_VHR75L74MJ.p8"
ISS = "b681d77e-4c5b-4154-b3e4-962dab155c2d"
KID = "VHR75L74MJ"
APP_ID = "6780245563"

key = open(KEY_PATH, encoding="utf-8").read()
now = int(time.time())
token = jwt.encode(
    {"iss": ISS, "exp": now + 1200, "aud": "appstoreconnect-v1"},
    key,
    algorithm="ES256",
    headers={"kid": KID, "typ": "JWT"},
)
H = {"Authorization": f"Bearer {token}"}


def get(url):
    r = requests.get(url, headers=H, timeout=30)
    print(f"\n--- {url.split('?')[0].split('/')[-1]} --- HTTP {r.status_code}")
    if r.status_code != 200:
        print(r.text[:500])
        return None
    return r.json()


# Builds
data = get(
    f"https://api.appstoreconnect.apple.com/v1/builds"
    f"?filter[app]={APP_ID}&limit=20&sort=-uploadedDate&include=preReleaseVersion"
)
if data:
    inc = {x["id"]: x for x in data.get("included", [])}
    print("BUILDS:")
    for b in data.get("data", []):
        a = b["attributes"]
        vid = b.get("relationships", {}).get("preReleaseVersion", {}).get("data", {})
        ver = inc.get(vid.get("id", ""), {}).get("attributes", {}).get("version", "?") if vid else "?"
        print(
            f"  #{a.get('version')} v{ver} | {a.get('processingState')} | "
            f"expired={a.get('expired')} | {a.get('uploadedDate', '')[:19]}"
        )
    nums = [b["attributes"]["version"] for b in data.get("data", [])]
    print(f"\n>>> BUILD 11 EXISTE? {'SIM' if '11' in nums else 'NAO — NUNCA CHEGOU NA APPLE'}")

# App Store versions
data = get(
    f"https://api.appstoreconnect.apple.com/v1/appStoreVersions"
    f"?filter[app]={APP_ID}&limit=10&sort=-createdDate"
)
if data:
    print("\nVERSOES APP STORE:")
    for v in data.get("data", []):
        a = v["attributes"]
        print(f"  {a.get('versionString')} | state={a.get('appStoreState')} | platform={a.get('platform')}")

# Review submissions
data = get(
    f"https://api.appstoreconnect.apple.com/v1/reviewSubmissions"
    f"?filter[app]={APP_ID}&limit=5&sort=-submittedDate&include=items"
)
if data:
    print("\nSUBMISSOES REVISAO:")
    if not data.get("data"):
        print("  (nenhuma)")
    for s in data.get("data", []):
        a = s["attributes"]
        print(f"  state={a.get('state')} | submitted={str(a.get('submittedDate',''))[:19]}")
