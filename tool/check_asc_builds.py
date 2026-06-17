"""Lista builds no App Store Connect via API."""
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
headers = {"Authorization": f"Bearer {token}"}

r = requests.get(
    f"https://api.appstoreconnect.apple.com/v1/builds"
    f"?filter[app]={APP_ID}&limit=20&sort=-uploadedDate&include=preReleaseVersion",
    headers=headers,
    timeout=30,
)
print("HTTP", r.status_code)
if r.status_code != 200:
    print(r.text[:1000])
    raise SystemExit(1)

data = r.json()
included = {x["id"]: x for x in data.get("included", [])}
print("\n=== BUILDS NA APPLE (TROCA COPA 6780245563) ===\n")
if not data.get("data"):
    print("NENHUM BUILD ENCONTRADO!")
else:
    for b in data["data"]:
        a = b["attributes"]
        ver_rel = b.get("relationships", {}).get("preReleaseVersion", {}).get("data")
        ver = ""
        if ver_rel:
            ver = included.get(ver_rel["id"], {}).get("attributes", {}).get("version", "?")
        print(
            f"Build {a.get('version'):>3} | versao {ver} | "
            f"state={a.get('processingState')} | "
            f"uploaded={a.get('uploadedDate', '')[:19]} | "
            f"expired={a.get('expired')}"
        )
