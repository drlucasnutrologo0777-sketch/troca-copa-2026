"""Normaliza APP_STORE_CONNECT_PRIVATE_KEY e grava PEM valido em /tmp."""
import base64
import os
import re
import sys


def normalize_pem(raw: str) -> str:
    text = raw.strip().strip('"').strip("'")
    if not text:
        raise ValueError("Chave vazia")

    # Base64 do arquivo .p8 inteiro (alternativa no Codemagic)
    if "BEGIN PRIVATE KEY" not in text and re.fullmatch(r"[A-Za-z0-9+/=\s]+", text):
        try:
            decoded = base64.b64decode(text.replace("\n", "").replace(" ", ""))
            text = decoded.decode("utf-8")
        except Exception:
            pass

    if "BEGIN PRIVATE KEY" not in text:
        raise ValueError("Falta -----BEGIN PRIVATE KEY-----")

    begin = "-----BEGIN PRIVATE KEY-----"
    end = "-----END PRIVATE KEY-----"
    start = text.find(begin)
    stop = text.find(end)
    if start < 0 or stop < 0:
        raise ValueError("Formato PEM incompleto")

    body = text[start + len(begin) : stop]
    body = re.sub(r"\s+", "", body)
    lines = [body[i : i + 64] for i in range(0, len(body), 64)]
    return begin + "\n" + "\n".join(lines) + "\n" + end + "\n"


def main() -> None:
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/AuthKey.p8"
    raw = os.environ.get("APP_STORE_CONNECT_PRIVATE_KEY", "")
    if not raw and os.environ.get("APP_STORE_CONNECT_PRIVATE_KEY_B64"):
        raw = os.environ["APP_STORE_CONNECT_PRIVATE_KEY_B64"]

    pem = normalize_pem(raw)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(pem)
    print(f"Chave API gravada em {out}")


if __name__ == "__main__":
    main()
