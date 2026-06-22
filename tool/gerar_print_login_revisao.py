"""Gera screenshot login Build 22 — iPhone ou iPad Air 11\" (1668x2388)."""
from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

DESKTOP = Path.home() / "OneDrive" / "Desktop"
if not DESKTOP.exists():
    DESKTOP = Path.home() / "Desktop"

FUNDO = (30, 58, 95)
BRANCO = (255, 255, 255)
ESCURO = (26, 26, 46)
VERDE = (61, 170, 125)
AZUL = (43, 158, 216)
AMARELO = (245, 197, 24)

CIRCULOS = [
    (0, 137, 123),
    (57, 73, 171),
    (102, 187, 106),
    (66, 165, 245),
    (142, 36, 170),
    (255, 112, 67),
]

# iPad Air 11" — formato aceito App Store Connect
IPAD_W, IPAD_H = 1668, 2388
IPHONE_W, IPHONE_H = 1284, 2778


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for p in (
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]
        if bold
        else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]
    ):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_circles(img: Image.Image, w: int, h: int) -> None:
    import random

    rnd = random.Random(26)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for i in range(18):
        col = CIRCULOS[i % len(CIRCULOS)]
        r = int(w * (0.18 + rnd.random() * 0.22))
        cx = int(rnd.random() * w)
        cy = int(rnd.random() * h)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*col, 190))
    base = Image.new("RGB", (w, h), FUNDO)
    img.paste(Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB"))


def render(w: int, h: int, hora: str) -> Image.Image:
    sx = w / IPHONE_W
    sy = h / IPHONE_H
    s = (sx + sy) / 2

    def fs(n: int) -> int:
        return max(12, int(n * s))

    def px(n: float) -> int:
        return int(n * sx)

    def py(n: float) -> int:
        return int(n * sy)

    img = Image.new("RGB", (w, h), FUNDO)
    draw_circles(img, w, h)
    draw = ImageDraw.Draw(img)

    draw.text((px(48), py(54)), "TestFlight", fill=BRANCO, font=font(fs(26)))
    draw.text((w // 2, py(54)), hora, fill=BRANCO, font=font(fs(38), True), anchor="mt")
    draw.text((w - px(48), py(54)), "47%", fill=BRANCO, font=font(fs(28)), anchor="rt")

    y = py(200)
    draw.text((w // 2, y), "TROCAR FIGURINHAS", fill=BRANCO, font=font(fs(52), True), anchor="mm")
    y += py(50)
    disclaimer = "App independente de colecionadores. Não é produto oficial de álbum licenciado."
    draw.text((w // 2, y), disclaimer, fill=AMARELO, font=font(fs(22)), anchor="mm")
    y += py(55)

    bx0, bx1 = px(80), w - px(80)
    bh = py(120)
    draw.rounded_rectangle((bx0, y, bx1, y + bh), radius=fs(28), fill=VERDE)
    draw.text((bx0 + px(30), y + py(38)), "+", fill=BRANCO, font=font(fs(40), True))
    draw.text((bx0 + px(90), y + py(28)), "PRIMEIRA VEZ? CRIE SUA CONTA", fill=BRANCO, font=font(fs(28), True))
    draw.text((bx0 + px(90), y + py(68)), "Nome, e-mail e foto (opcional)", fill=BRANCO, font=font(fs(22)))
    draw.text((bx1 - px(40), y + py(55)), ">", fill=BRANCO, font=font(fs(36), True))
    y += py(150)

    tab_h = py(70)
    draw.rounded_rectangle((px(60), y, w - px(60), y + tab_h), radius=fs(18), fill=(60, 80, 110))
    tabs = [("LOGIN", True), ("CADASTRO", False), ("ESQUECI", False)]
    tw = (w - px(120)) // 3
    for i, (label, active) in enumerate(tabs):
        tx0 = px(60) + i * tw
        if active:
            draw.rounded_rectangle(
                (tx0 + 4, y + 4, tx0 + tw - 4, y + tab_h - 4), radius=fs(14), fill=AZUL
            )
            draw.text((tx0 + tw // 2, y + tab_h // 2), label, fill=ESCURO, font=font(fs(24), True), anchor="mm")
        else:
            draw.text((tx0 + tw // 2, y + tab_h // 2), label, fill=BRANCO, font=font(fs(24), True), anchor="mm")
    y += tab_h + py(30)

    card_h = py(520)
    draw.rounded_rectangle((px(60), y, w - px(60), y + card_h), radius=fs(36), fill=BRANCO)
    cy = y + py(60)
    for label, icon in (("E-mail", "@"), ("Senha", "o")):
        fh = py(90)
        draw.rounded_rectangle((px(100), cy, w - px(100), cy + fh), radius=fs(16), fill=(245, 247, 250))
        draw.text((px(130), cy + fh // 2), icon, fill=AZUL, font=font(fs(28)), anchor="lm")
        draw.text((px(200), cy + fh // 2), label, fill=(140, 140, 150), font=font(fs(30)), anchor="lm")
        cy += py(120)
    draw.rounded_rectangle((px(100), cy + py(20), w - px(100), cy + py(110)), radius=fs(24), fill=AMARELO)
    draw.text((w // 2, cy + py(65)), "ENTRAR", fill=ESCURO, font=font(fs(36), True), anchor="mm")

    draw.rounded_rectangle((w // 2 - px(120), h - py(48), w // 2 + px(120), h - py(20)), radius=8, fill=BRANCO)
    return img


def main() -> None:
    ipad = "--iphone" not in sys.argv
    w, h = (IPAD_W, IPAD_H) if ipad else (IPHONE_W, IPHONE_H)
    agora = datetime.now()
    hora = agora.strftime("%H:%M")
    stamp = agora.strftime("%Y-%m-%d_%H-%M")
    tag = "IPAD_AIR11" if ipad else "IPHONE"

    img = render(w, h, hora)
    base = DESKTOP / f"LOGIN_BUILD22_{tag}_REVISAO_APPLE"
    png = base.with_suffix(".png")
    jpg = base.with_suffix(".jpg")

    img.save(png, "PNG", optimize=True)
    img.save(jpg, "JPEG", quality=92, optimize=True)
    print(f"{tag} {w}x{h} hora {hora}")
    print(png)
    print(jpg)


if __name__ == "__main__":
    main()
