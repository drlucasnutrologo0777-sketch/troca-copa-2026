#!/usr/bin/env python3
"""Arte promocional IAP 1024x1024 — SEM preço, NÃO é screenshot (Guideline 2.3.2)."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W = H = 1024
OUTS = [
    Path(__file__).resolve().parents[1] / "IAP-PROMO-IMAGE.png",
    Path.home() / "Desktop" / "Idoso Care IAP Promo 1024.png",
]

GREEN = (46, 139, 87)
GREEN_D = (38, 122, 76)
GREEN_M = (56, 160, 100)
WHITE = (255, 255, 255)
CREAM = (248, 252, 249)


def font(size, bold=False):
    for p in (
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)

    # fundo ilustrado (não screenshot)
    for i, col in enumerate([(46, 139, 87), (38, 122, 76), (30, 105, 68)]):
        d.ellipse((-120 + i * 40, 680 + i * 30, 420 + i * 40, 1220 + i * 30), fill=col)
    d.ellipse((620, -80, 1120, 420), fill=(210, 235, 218))
    d.ellipse((700, 760, 1080, 1140), fill=(180, 215, 190))

    rr = d.rounded_rectangle
    rr((72, 72, W - 72, H - 72), 56, WHITE)

    # ícone app estilizado
    rr((412, 140, 612, 340), 40, GREEN)
    d.ellipse((462, 190, 562, 290), fill=WHITE)
    d.text((512, 400), "Idoso Care 24H", fill=GREEN_D, font=font(48, True), anchor="mm")

    d.text((512, 490), "Taxa de manutenção", fill=GREEN_D, font=font(52, True), anchor="mm")
    d.text((512, 560), "Plataforma · consumível", fill=GREEN_M, font=font(30), anchor="mm")

    rr((140, 620, W - 140, 760), 32, GREEN)
    d.text((512, 690), "Pagamento via App Store", fill=WHITE, font=font(38, True), anchor="mm")

    rr((180, 810, W - 180, 910), 24, (232, 245, 238))
    d.text((512, 860), "Manutenção do marketplace de cuidadores", fill=GREEN_D, font=font(28), anchor="mm")

    d.text((512, 960), "ic24_taxa_manutencao", fill=(120, 150, 130), font=font(22), anchor="mm")

    for path in OUTS:
        path.parent.mkdir(parents=True, exist_ok=True)
        img.save(path, "PNG", optimize=True)
        print(f"Salvo: {path}")


if __name__ == "__main__":
    main()
