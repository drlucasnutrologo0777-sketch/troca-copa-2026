"""Simula 2 usuários trocando figurinha — só IAP Apple, sem PIX. Gera prints para revisão."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

DESKTOP = Path.home() / "OneDrive" / "Desktop"
if not DESKTOP.exists():
    DESKTOP = Path.home() / "Desktop"

AZUL = (43, 158, 216)
VERDE = (61, 170, 125)
AMARELO = (245, 197, 24)
VERMELHO = (232, 76, 61)
ROXO = (139, 92, 246)
ROSA = (232, 121, 249)
BRANCO = (255, 255, 255)
ESCURO = (26, 26, 46)
FUNDO = (30, 58, 95)
CINZA = (110, 110, 120)

IPHONE = (1284, 2778)
PRECO = "R$ 0,99"
PRODUTO = "br.com.seusite.trocacopa.taxachat01"
USER1 = "Cliente Teste"
USER2 = "Colecionador 2"


def font(size: int, bold: bool = False):
    for p in (
        ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf"] if bold
        else ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]
    ):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_background(img: Image.Image) -> None:
    w, h = img.size
    img.paste(Image.new("RGB", (w, h), FUNDO), (0, 0))
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
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(overlay).ellipse(
            (int(cx * w - rad), int(cy * h - rad), int(cx * w + rad), int(cy * h + rad)),
            fill=(*col, 170),
        )
        img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))


def chrome(draw: ImageDraw.ImageDraw, w: int, h: int, title: str) -> None:
    draw.text((60, 52), "11:21", fill=BRANCO, font=font(34, True))
    draw.text((w - 220, 52), "TestFlight  68%", fill=BRANCO, font=font(26))
    draw.text((90, 118), "<", fill=BRANCO, font=font(48, True))
    draw.text((w // 2, 130), title, fill=BRANCO, font=font(34, True), anchor="mm")
    draw.rounded_rectangle((w // 2 - 120, h - 50, w // 2 + 120, h - 28), radius=8, fill=BRANCO)


def card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    draw.rounded_rectangle(box, radius=36, fill=BRANCO)


def badge_sem_pix(draw: ImageDraw.ImageDraw, cx: int, y: int) -> None:
    b = (cx - 420, y, cx + 420, y + 70)
    draw.rounded_rectangle(b, radius=18, fill=(220, 252, 231), outline=VERDE, width=3)
    draw.text((cx, y + 35), "Sem PIX · Pagamento somente pela App Store", fill=VERDE, font=font(28, True), anchor="mm")


def tela_match_confirmado() -> Image.Image:
    w, h = IPHONE
    img = Image.new("RGB", (w, h))
    draw_background(img)
    draw = ImageDraw.Draw(img)
    chrome(draw, w, h, "Match")

    dlg = (100, 900, w - 100, 1650)
    card(draw, dlg)
    cx = w // 2
    draw.text((cx, 1020), "MATCH CONFIRMADO!", fill=ESCURO, font=font(48, True), anchor="mm")
    txt = (
        f"{USER1} e {USER2} aceitaram a troca.\n\n"
        f"Negócio fechado — compre {PRECO} na App Store\n"
        "para liberar contato e chat."
    )
    y = 1140
    for line in txt.split("\n"):
        draw.text((cx, y), line, fill=ESCURO, font=font(32), anchor="mm")
        y += 48
    btn = (cx - 320, 1480, cx + 320, 1580)
    draw.rounded_rectangle(btn, radius=32, fill=AMARELO)
    draw.text((cx, 1530), "VER NEGÓCIO FECHADO", fill=ESCURO, font=font(36, True), anchor="mm")
    badge_sem_pix(draw, cx, 1720)
    return img


def tela_compra_iap(usuario: str, outro_pago: bool) -> Image.Image:
    w, h = IPHONE
    img = Image.new("RGB", (w, h))
    draw_background(img)
    draw = ImageDraw.Draw(img)
    chrome(draw, w, h, "Compra in-app — Match confirmado")

    card(draw, (80, 480, w - 80, 2000))
    cx = w // 2
    draw.text((cx, 680), PRECO, fill=VERDE, font=font(96, True), anchor="mm")
    draw.text(
        (cx, 800),
        "Pagamento pela App Store.\nLibera contato e chat após os dois comprarem.",
        fill=ESCURO,
        font=font(34),
        anchor="mm",
        align="center",
    )
    badge_sem_pix(draw, cx, 900)

    info = (cx - 400, 1000, cx + 400, 1180)
    draw.rounded_rectangle(info, radius=20, fill=(240, 248, 255), outline=AZUL, width=2)
    draw.text((cx, 1040), f"Usuário: {usuario}", fill=ESCURO, font=font(30, True), anchor="mm")
    status = f"Outro lado ({USER2 if usuario == USER1 else USER1}): " + (
        "já pagou ✓" if outro_pago else "aguardando pagamento"
    )
    draw.text((cx, 1100), status, fill=VERDE if outro_pago else CINZA, font=font(28), anchor="mm")

    btn = (cx - 340, 1280, cx + 340, 1420)
    draw.rounded_rectangle(btn, radius=40, fill=AMARELO)
    draw.text((cx, 1350), f"COMPRAR · {PRECO}", fill=ESCURO, font=font(44, True), anchor="mm")
    draw.text((cx, 1520), PRODUTO, fill=CINZA, font=font(26), anchor="mm")
    draw.text((cx, 1570), "Consumível In-App Purchase (StoreKit)", fill=CINZA, font=font(28), anchor="mm")
    draw.text((cx, 1680), "Não há opção PIX neste app.", fill=VERMELHO, font=font(30, True), anchor="mm")
    return img


def tela_apple_sheet(usuario: str) -> Image.Image:
    base = tela_compra_iap(usuario, False).convert("RGBA")
    w, h = base.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 130))
    img = Image.alpha_composite(base, overlay)
    draw = ImageDraw.Draw(img)
    cx = w // 2
    sheet = (60, 1050, w - 60, 2150)
    draw.rounded_rectangle(sheet, radius=48, fill=(245, 245, 250, 255))
    draw.text((cx, 1140), "App Store", fill=ESCURO, font=font(40, True), anchor="mm")
    draw.text((cx, 1220), "TROCAR FIGURINHAS", fill=ESCURO, font=font(32, True), anchor="mm")
    draw.text((cx, 1290), "Liberar Match (consumível)", fill=CINZA, font=font(30), anchor="mm")
    draw.text((cx, 1380), PRECO, fill=ESCURO, font=font(80, True), anchor="mm")
    draw.text((cx, 1470), "In-App Purchase · Sandbox", fill=CINZA, font=font(28), anchor="mm")
    draw.rounded_rectangle((cx - 280, 1540, cx + 280, 1660), radius=40, fill=AZUL)
    draw.text((cx, 1600), "Confirmar compra", fill=BRANCO, font=font(36, True), anchor="mm")
    draw.text((cx, 1740), PRODUTO, fill=CINZA, font=font(24), anchor="mm")
    draw.text((cx, 1800), f"Conta: {usuario.lower().replace(' ', '')}@gmail.com", fill=CINZA, font=font(26), anchor="mm")
    draw.text((cx, 1900), "[ Duplo clique lateral para confirmar ]", fill=CINZA, font=font(26), anchor="mm")
    return img.convert("RGB")


def tela_pagamento_ok(usuario: str) -> Image.Image:
    w, h = IPHONE
    img = Image.new("RGB", (w, h))
    draw_background(img)
    draw = ImageDraw.Draw(img)
    chrome(draw, w, h, "Compra in-app — Match confirmado")
    card(draw, (80, 480, w - 80, 2000))
    cx = w // 2
    draw.ellipse((cx - 70, 700, cx + 70, 840), fill=VERDE)
    draw.line([(cx - 30, 770), (cx - 5, 800), (cx + 40, 740)], fill=BRANCO, width=12)
    draw.text((cx, 920), "Compra confirmada!", fill=ESCURO, font=font(48, True), anchor="mm")
    draw.text((cx, 1000), f"Pagamento IAP registrado — {usuario}", fill=ESCURO, font=font(30), anchor="mm")

    box = (cx - 420, 1080, cx + 420, 1380)
    draw.rounded_rectangle(box, radius=20, fill=(240, 248, 255), outline=AZUL, width=2)
    lines = [
        "payments/ · metodo: iap",
        "status: confirmado_iap",
        f"productId: {PRODUTO}",
        "platform: apple",
        f"valor: {PRECO}",
        "pix: (não utilizado)",
    ]
    y = 1120
    for line in lines:
        col = VERMELHO if "não utilizado" in line else ESCURO
        draw.text((cx, y), line, fill=col, font=font(26), anchor="mm")
        y += 42

    draw.text((cx, 1520), "Aguardando o outro usuário\ncomprar na App Store...", fill=CINZA, font=font(32), anchor="mm", align="center")
    return img


def tela_chat_liberado() -> Image.Image:
    w, h = IPHONE
    img = Image.new("RGB", (w, h))
    draw_background(img)
    draw = ImageDraw.Draw(img)
    chrome(draw, w, h, "Chat")

    card(draw, (120, 700, w - 120, 1200))
    cx = w // 2
    draw.text((cx, 820), "Chat liberado ✓", fill=VERDE, font=font(44, True), anchor="mm")
    draw.text(
        (cx, 920),
        f"{USER1} ↔ {USER2}\nAmbos concluíram IAP na App Store",
        fill=ESCURO,
        font=font(32),
        anchor="mm",
        align="center",
    )
    badge_sem_pix(draw, cx, 1020)

    # bolhas de chat
    card(draw, (100, 1350, 700, 1480))
    draw.text((120, 1410), "Oi! Troco a figurinha 45?", fill=ESCURO, font=font(30))
    card(draw, (w - 700, 1520, w - 100, 1650))
    draw.text((w - 680, 1580), "Fechado! Nos vemos amanhã.", fill=ESCURO, font=font(30))

    troca = (cx - 400, 1750, cx + 400, 1950)
    draw.rounded_rectangle(troca, radius=24, fill=(255, 249, 230), outline=AMARELO, width=2)
    draw.text((cx, 1810), "Troca acordada", fill=ESCURO, font=font(32, True), anchor="mm")
    draw.text((cx, 1870), "Dou: #45 México · Recebo: #12 Brasil", fill=ESCURO, font=font(28), anchor="mm")
    return img


def painel_fluxo() -> Image.Image:
    """Resumo horizontal para anexar na revisão."""
    thumbs = [
        ("1 Match", tela_match_confirmado()),
        ("2 User1 IAP", tela_compra_iap(USER1, False)),
        ("3 Apple", tela_apple_sheet(USER1)),
        ("4 User2 IAP", tela_compra_iap(USER2, True)),
        ("5 Chat", tela_chat_liberado()),
    ]
    tw, th = 520, 1120
    pad = 24
    W = pad + len(thumbs) * (tw + pad)
    H = th + 120
    out = Image.new("RGB", (W, H), (245, 247, 250))
    draw = ImageDraw.Draw(out)
    draw.text((W // 2, 40), "TROCAR FIGURINHAS — Simulação 2 usuários · só App Store (sem PIX)", fill=ESCURO, font=font(32, True), anchor="mm")
    x = pad
    for label, im in thumbs:
        thumb = im.resize((tw, th), Image.Resampling.LANCZOS)
        out.paste(thumb, (x, 80))
        draw.text((x + tw // 2, H - 28), label, fill=CINZA, font=font(22), anchor="mm")
        x += tw + pad
    return out


def main() -> None:
    out = DESKTOP / "IAP_SIMULACAO_2_USUARIOS_17-06-2026"
    out.mkdir(parents=True, exist_ok=True)

    files = {
        "01_match_confirmado_mutuo.png": tela_match_confirmado(),
        "02_usuario1_tela_compra_iap.png": tela_compra_iap(USER1, False),
        "03_usuario1_sheet_app_store.png": tela_apple_sheet(USER1),
        "04_usuario1_pagamento_confirmado_iap.png": tela_pagamento_ok(USER1),
        "05_usuario2_tela_compra_iap.png": tela_compra_iap(USER2, True),
        "06_chat_liberado_apos_ambos_iap.png": tela_chat_liberado(),
        "07_painel_fluxo_completo.png": painel_fluxo(),
        "08_promo_iap_1284x2778.png": tela_compra_iap(USER1, False),
    }
    for name, im in files.items():
        p = out / name
        im.save(p, "PNG", optimize=True)
        print("OK", p)

    (out / "LEIA-ME.txt").write_text(
        "SIMULAÇÃO IAP — 2 USUÁRIOS — TROCAR FIGURINHAS\n"
        "Sem PIX. Somente In-App Purchase (App Store).\n\n"
        "Envie no App Store Connect:\n"
        "- App Review Information (anexos)\n"
        "- Ou Compras no app → match_unlock → screenshot de revisão\n\n"
        f"Produto: {PRODUTO}\n"
        "Contas teste: clienteteste@gmail.com / clienteteste2@gmail.com\n"
        "Senha: teste@123\n",
        encoding="utf-8",
    )
    print("Pasta:", out)


if __name__ == "__main__":
    main()
