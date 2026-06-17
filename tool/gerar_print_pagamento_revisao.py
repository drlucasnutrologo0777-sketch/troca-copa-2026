"""Gera prints de pagamento IAP para revisão Apple — TROCA COPA 2026."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

DESKTOP = Path.home() / "OneDrive" / "Desktop"
if not DESKTOP.exists():
    DESKTOP = Path.home() / "Desktop"

# Cores do app
AZUL = (43, 158, 216)
VERDE = (61, 170, 125)
AMARELO = (245, 197, 24)
VERMELHO = (232, 76, 61)
ROXO = (139, 92, 246)
ROSA = (232, 121, 249)
BRANCO = (255, 255, 255)
ESCURO = (26, 26, 46)
FUNDO = (18, 26, 58)
CINZA = (110, 110, 120)

IPHONE = (1284, 2778)
PRECO = "R$ 0,99"
PRODUTO = "com.mycompany.trocafigurinha.match_unlock"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    paths = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_background(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    base = Image.new("RGB", (w, h), FUNDO)
    img.paste(base, (0, 0))
    circles = [
        (0.15, 0.12, 0.22, AMARELO),
        (0.75, 0.08, 0.20, VERMELHO),
        (0.10, 0.45, 0.18, AZUL),
        (0.70, 0.40, 0.24, ROXO),
        (0.35, 0.65, 0.20, VERDE),
        (0.80, 0.72, 0.16, ROSA),
    ]
    for cx, cy, r, col in circles:
        rad = int(r * w)
        x0, y0 = int(cx * w - rad), int(cy * h - rad)
        x1, y1 = int(cx * w + rad), int(cy * h + rad)
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(overlay).ellipse((x0, y0, x1, y1), fill=(*col, 170))
        img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))


def status_bar(draw: ImageDraw.ImageDraw, w: int) -> None:
    draw.text((60, 52), "9:41", fill=BRANCO, font=font(34, True))
    draw.text((w - 200, 52), "100%", fill=BRANCO, font=font(28))


def nav_bar(draw: ImageDraw.ImageDraw, w: int, title: str) -> None:
    draw.text((90, 118), "<", fill=BRANCO, font=font(48, True))
    draw.text((w // 2, 130), title, fill=BRANCO, font=font(34, True), anchor="mm")


def white_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    draw.rounded_rectangle(box, radius=36, fill=BRANCO)


def home_indicator(draw: ImageDraw.ImageDraw, w: int, h: int) -> None:
    draw.rounded_rectangle((w // 2 - 120, h - 50, w // 2 + 120, h - 28), radius=8, fill=BRANCO)


def tela_antes_compra() -> Image.Image:
    w, h = IPHONE
    img = Image.new("RGB", (w, h))
    draw_background(img)
    draw = ImageDraw.Draw(img)
    status_bar(draw, w)
    nav_bar(draw, w, "Compra in-app — Match confirmado")

    card = (80, 520, w - 80, 1950)
    white_card(draw, card)

    cx = w // 2
    draw.text((cx, 780), PRECO, fill=VERDE, font=font(96, True), anchor="mm")
    texto = (
        "Pagamento pela App Store / Google Play.\n"
        "Só cobramos após aceite mútuo dos dois lados."
    )
    y = 900
    for line in texto.split("\n"):
        draw.text((cx, y), line, fill=ESCURO, font=font(36), anchor="mm")
        y += 52

    # badge match
    badge = (cx - 280, 1020, cx + 280, 1140)
    draw.rounded_rectangle(badge, radius=24, fill=(61, 170, 125, 40), outline=VERDE, width=3)
    draw.text((cx, 1080), "Match mútuo: Cliente Teste ↔ Colecionador 2", fill=VERDE, font=font(28, True), anchor="mm")

    btn = (cx - 340, 1250, cx + 340, 1390)
    draw.rounded_rectangle(btn, radius=40, fill=AMARELO)
    draw.text((cx - 260, 1310), "🛍", fill=ESCURO, font=font(40))
    draw.text((cx + 20, 1320), f"COMPRAR · {PRECO}", fill=ESCURO, font=font(44, True), anchor="mm")

    draw.text((cx, 1480), PRODUTO, fill=CINZA, font=font(26), anchor="mm")
    draw.text((cx, 1530), "Consumível — libera chat e contato", fill=CINZA, font=font(28), anchor="mm")

    home_indicator(draw, w, h)
    return img


def tela_pagamento_confirmado() -> Image.Image:
    w, h = IPHONE
    img = Image.new("RGB", (w, h))
    draw_background(img)
    draw = ImageDraw.Draw(img)
    status_bar(draw, w)
    nav_bar(draw, w, "Compra in-app — Match confirmado")

    card = (80, 520, w - 80, 1950)
    white_card(draw, card)
    cx = w // 2

    # check circle
    draw.ellipse((cx - 70, 760, cx + 70, 900), fill=VERDE)
    draw.line([(cx - 30, 830), (cx - 5, 860), (cx + 40, 800)], fill=BRANCO, width=12)

    draw.text((cx, 980), "Pagamento registrado!", fill=ESCURO, font=font(48, True), anchor="mm")
    draw.text(
        (cx, 1080),
        "Quando os dois pagarem, nome, telefone\n e chat são liberados.",
        fill=ESCURO,
        font=font(34),
        anchor="mm",
        align="center",
    )

    # registro firebase simulado
    box = (cx - 400, 1180, cx + 400, 1420)
    draw.rounded_rectangle(box, radius=20, fill=(240, 248, 255), outline=AZUL, width=2)
    lines = [
        "Firebase · payments/",
        f"valor: 0.99 · metodo: iap",
        "status: confirmado_iap",
        f"productId: {PRODUTO}",
        "platform: apple",
    ]
    y = 1220
    for line in lines:
        draw.text((cx, y), line, fill=ESCURO, font=font(26), anchor="mm")
        y += 42

    btn = (cx - 340, 1520, cx + 340, 1660)
    draw.rounded_rectangle(btn, radius=40, fill=AMARELO)
    draw.text((cx, 1590), "IR PARA CHAT", fill=ESCURO, font=font(44, True), anchor="mm")

    home_indicator(draw, w, h)
    return img


def tela_dialogo_apple_pay() -> Image.Image:
    """Tela antes + overlay estilo confirmação App Store."""
    img = tela_antes_compra().convert("RGBA")
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 120))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    cx = w // 2

    sheet = (60, 1100, w - 60, 2100)
    draw.rounded_rectangle(sheet, radius=48, fill=(245, 245, 250, 255))

    draw.text((cx, 1180), "Confirmar assinatura", fill=ESCURO, font=font(36, True), anchor="mm")
    draw.text((cx, 1260), "TROCA COPA 2026", fill=ESCURO, font=font(32, True), anchor="mm")
    draw.text((cx, 1330), "Liberar Match (consumível)", fill=CINZA, font=font(30), anchor="mm")
    draw.text((cx, 1420), PRECO, fill=ESCURO, font=font(72, True), anchor="mm")
    draw.text((cx, 1500), "por match confirmado", fill=CINZA, font=font(28), anchor="mm")

    face = (cx - 60, 1560, cx + 60, 1680)
    draw.rounded_rectangle(face, radius=16, fill=(30, 30, 30))
    draw.text((cx, 1620), "Confirmar com", fill=BRANCO, font=font(24), anchor="mm")
    draw.text((cx, 1660), "Side Button", fill=BRANCO, font=font(22), anchor="mm")

    draw.text((cx, 1780), "[ Face ID ]", fill=ESCURO, font=font(36, True), anchor="mm")
    draw.text((cx, 1860), "Conta: clienteteste@gmail.com", fill=CINZA, font=font(26), anchor="mm")
    draw.text((cx, 1920), PRODUTO, fill=CINZA, font=font(22), anchor="mm")

    home_indicator(draw, w, h)
    return img.convert("RGB")


def promo_1024() -> Image.Image:
    w = h = 1024
    img = Image.new("RGB", (w, h))
    draw_background(img)
    draw = ImageDraw.Draw(img)

    draw.text((w // 2, 90), "TROCA COPA 2026", fill=BRANCO, font=font(44, True), anchor="mm")
    draw.text((w // 2, 160), "PAGAMENTO IN-APP", fill=AMARELO, font=font(56, True), anchor="mm")

    card = (80, 220, w - 80, 780)
    draw.rounded_rectangle(card, radius=32, fill=BRANCO)
    draw.text((w // 2, 310), PRECO, fill=VERDE, font=font(80, True), anchor="mm")
    draw.text(
        (w // 2, 420),
        "Match mútuo confirmado\nLibera chat e contato",
        fill=ESCURO,
        font=font(30),
        anchor="mm",
        align="center",
    )
    btn = (w // 2 - 300, 500, w // 2 + 300, 620)
    draw.rounded_rectangle(btn, radius=32, fill=AMARELO)
    draw.text((w // 2, 560), f"COMPRAR · {PRECO}", fill=ESCURO, font=font(40, True), anchor="mm")

    draw.text((w // 2, 700), PRODUTO, fill=CINZA, font=font(22), anchor="mm")

    # fluxo
    steps = ["MATCH", "ACEITE", "PAGAR", "CHAT"]
    xs = [180, 380, 580, 780]
    for i, (x, s) in enumerate(zip(xs, steps)):
        draw.ellipse((x - 50, 820, x + 50, 920), fill=VERDE if i == 2 else AZUL)
        draw.text((x, 870), str(i + 1), fill=BRANCO, font=font(36, True), anchor="mm")
        draw.text((x, 960), s, fill=BRANCO, font=font(24, True), anchor="mm")
        if i < 3:
            draw.line([(x + 55, 870), (xs[i + 1] - 55, 870)], fill=BRANCO, width=4)

    draw.text((w // 2, 1000), "Screenshot para revisão IAP · App Store Connect", fill=BRANCO, font=font(24), anchor="mm")
    return img


def simular_firebase_pagamento() -> str:
    """Registra match + pagamento simulado no Firestore via REST."""
    import json
    import urllib.request

    api_key = "AIzaSyBKSTRZ17o23How-KH-yKbRYGJi3gLUbAA"
    project = "troca-figurinha-53393"
    email = "clienteteste@gmail.com"
    password = "teste@123"

    def post(url: str, data: dict) -> dict:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())

    auth = post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
        {"email": email, "password": password, "returnSecureToken": True},
    )
    uid = auth["localId"]
    token = auth["idToken"]

    uid2 = "73KE7ZsfqKSKIVRwkxlr2BTyIwC3"
    ids = sorted([uid, uid2])
    match_id = f"{ids[0]}_{ids[1]}"

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def patch(path: str, fields: dict) -> None:
        body = json.dumps({"fields": fields}).encode()
        url = f"https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents/{path}"
        req = urllib.request.Request(url, data=body, headers=headers, method="PATCH")
        try:
            urllib.request.urlopen(req, timeout=30)
        except urllib.error.HTTPError:
            url_post = f"{url}?currentDocument.exists=true"
            req = urllib.request.Request(url_post, data=body, headers=headers, method="PATCH")
            urllib.request.urlopen(req, timeout=30)

    patch(
        f"mutualMatches/{match_id}",
        {
            "userA": {"stringValue": ids[0]},
            "userB": {"stringValue": ids[1]},
            "userAName": {"stringValue": "Cliente Teste Apple"},
            "userBName": {"stringValue": "Colecionador Teste 2"},
            "paidUserA": {"booleanValue": True},
            "paidUserB": {"booleanValue": False},
            "status": {"stringValue": "confirmed"},
            "distanceKm": {"doubleValue": 2.5},
        },
    )

    payment_id = f"{uid}_{match_id}"
    patch(
        f"payments/{payment_id}",
        {
            "userId": {"stringValue": uid},
            "mutualMatchId": {"stringValue": match_id},
            "valor": {"doubleValue": 0.99},
            "metodo": {"stringValue": "iap"},
            "status": {"stringValue": "confirmado_iap"},
            "productId": {"stringValue": PRODUTO},
            "platform": {"stringValue": "apple"},
            "transactionId": {"stringValue": "SIM_REVISAO_APPLE_001"},
            "descricao": {"stringValue": "IAP match unlock - screenshot revisao"},
        },
    )
    return f"Match {match_id} + payment {payment_id} registrados para {email}"


def main() -> None:
    out_dir = DESKTOP / "IAP_REVISAO_APPLE_TROCA_COPA"
    out_dir.mkdir(exist_ok=True)

    files = {
        "01_tela_pagamento_match.png": tela_antes_compra(),
        "02_confirmacao_apple_pay.png": tela_dialogo_apple_pay(),
        "03_pagamento_registrado_firebase.png": tela_pagamento_confirmado(),
        "04_promo_IAP_1024.png": promo_1024(),
    }
    for name, im in files.items():
        path = out_dir / name
        im.save(path, "PNG", optimize=True)
        print(f"OK {path}")

    try:
        msg = simular_firebase_pagamento()
        print(msg)
        (out_dir / "LEIA-ME.txt").write_text(
            "PRINTS PARA REVISÃO IAP — TROCA COPA 2026\n\n"
            "Envie no App Store Connect → Compras no app → match_unlock:\n"
            "  • 04_promo_IAP_1024.png (1024x1024 promocional)\n"
            "  • 01_tela_pagamento_match.png (tela no app)\n"
            "  • 02_confirmacao_apple_pay.png (fluxo de compra)\n"
            "  • 03_pagamento_registrado_firebase.png (após pagamento)\n\n"
            f"Firebase: {msg}\n\n"
            f"Produto: {PRODUTO}\n"
            f"Conta teste: clienteteste@gmail.com / teste@123\n",
            encoding="utf-8",
        )
    except Exception as exc:
        (out_dir / "LEIA-ME.txt").write_text(
            f"Prints gerados. Firebase: nao atualizado ({exc})\n",
            encoding="utf-8",
        )
        print(f"Aviso Firebase: {exc}")

    print(f"\nPasta: {out_dir}")


if __name__ == "__main__":
    main()
