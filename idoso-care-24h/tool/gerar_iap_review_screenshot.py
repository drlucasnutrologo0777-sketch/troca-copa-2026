"""IAP App Review Screenshot — iPad, taxa pendente US$ 1,99 + sheet App Store Sandbox."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# iPad portrait (App Review device: iPad Air 11")
W, H = 1640, 2360
ROOT = Path(__file__).resolve().parents[1]
OUTS = [
    ROOT / "IAP-REVIEW-SCREENSHOT.png",
    ROOT / "IAP-REVIEW-SCREENSHOT-IPAD.png",
    Path.home() / "Desktop" / "Idoso Care IAP Revisao Apple.png",
]

GREEN = (46, 139, 87)
GREEN_D = (38, 122, 76)
GREEN_L = (232, 245, 238)
GRAY = (102, 102, 102)
TEXT = (45, 45, 45)
WHITE = (255, 255, 255)
SOFT = (245, 247, 250)
LINE = (224, 224, 224)
ERR = (211, 47, 47)
APPLE_BG = (242, 242, 247)
APPLE_BLUE = (0, 122, 255)


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


def rr(d, box, r, fill, outline=None, width=0):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def draw_app(img):
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, H), fill=WHITE)

    # status bar iPad
    d.rectangle((0, 0, W, 48), fill=WHITE)
    d.text((48, 24), "9:41  Sat  4 Jul", fill=TEXT, font=font(22), anchor="lm")
    d.text((W - 48, 24), "98% ⚡", fill=TEXT, font=font(22), anchor="rm")

    # topbar
    d.rectangle((0, 48, W, 130), fill=WHITE)
    d.text((56, 89), "←", fill=GREEN, font=font(36, True), anchor="mm")
    d.text((W // 2, 89), "Taxa do app", fill=TEXT, font=font(32, True), anchor="mm")

    y = 150
    rr(d, (48, y, W - 48, y + 168), 18, GREEN_L)
    txt = (
        "Taxa de manutenção por diária de plantão acordada. "
        "Com taxa pendente você não aceita novas propostas até quitar via App Store."
    )
    d.text((72, y + 22), txt, fill=TEXT, font=font(24))

    y += 200
    cw = (W - 120) // 3
    cards = [
        ("R$ 280,00", "Diárias recebidas", TEXT),
        ("US$ 1,99", "Taxa por diária", TEXT),
        ("US$ 1,99", "Taxa pendente", ERR),
    ]
    for i, (val, lbl, col) in enumerate(cards):
        x0 = 48 + i * (cw + 12)
        rr(d, (x0, y, x0 + cw, y + 110), 14, SOFT, outline=LINE, width=2)
        d.text((x0 + cw // 2, y + 38), val, fill=col, font=font(28, True), anchor="mm")
        d.text((x0 + cw // 2, y + 78), lbl, fill=GRAY, font=font(20), anchor="mm")

    y += 140
    rr(d, (48, y, W - 48, y + 150), 16, WHITE, outline=LINE, width=2)
    d.text((72, y + 24), "Taxa pendente: US$ 1,99 · 1 diária", fill=ERR, font=font(26, True))
    d.text((72, y + 64), "Plantão demo — Família Silva", fill=TEXT, font=font(24))
    d.text((72, y + 100), "Produto consumível: ic24_taxa_manutencao", fill=GRAY, font=font(22))

    y += 180
    d.text((48, y), "PAGAR TAXA PENDENTE", fill=GREEN, font=font(22, True))
    y += 36
    d.text((48, y), "Pagamento exclusivo via Apple App Store (In-App Purchase).", fill=GRAY, font=font(22))

    y += 56
    rr(d, (48, y, W - 48, y + 72), 18, GREEN)
    d.text((W // 2, y + 36), "Pagar taxa via App Store", fill=WHITE, font=font(28, True), anchor="mm")


def draw_storekit(img):
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 100))
    base = img.convert("RGBA")
    base = Image.alpha_composite(base, overlay)
    d = ImageDraw.Draw(base)

    sh = 480
    sy = H - sh - 24
    rr(d, (0, sy, W, H), 28, APPLE_BG)
    d.rounded_rectangle((W // 2 - 48, sy + 12, W // 2 + 48, sy + 18), radius=3, fill=(190, 190, 195))

    d.text((W // 2, sy + 58), "App Store", fill=GRAY, font=font(22), anchor="mm")
    d.text((W // 2, sy + 110), "Taxa de manutenção", fill=TEXT, font=font(34, True), anchor="mm")
    d.text((W // 2, sy + 158), "Idoso Care 24H", fill=GRAY, font=font(24), anchor="mm")
    d.text((W // 2, sy + 210), "US$ 1,99", fill=TEXT, font=font(48, True), anchor="mm")
    d.text((W // 2, sy + 262), "Consumível", fill=GRAY, font=font(22), anchor="mm")

    rr(d, (56, sy + 300, W - 56, sy + 372), 18, APPLE_BLUE)
    d.text((W // 2, sy + 336), "Comprar", fill=WHITE, font=font(30, True), anchor="mm")

    d.text((W // 2, sy + 400), "Sandbox · ic24_taxa_manutencao", fill=(180, 120, 0), font=font(20, True), anchor="mm")
    d.text((W // 2, sy + 432), "Cobrança única", fill=GRAY, font=font(20), anchor="mm")

    return base.convert("RGB")


def main():
    img = Image.new("RGB", (W, H), WHITE)
    draw_app(img)
    img = draw_storekit(img)
    for path in OUTS:
        path.parent.mkdir(parents=True, exist_ok=True)
        img.save(path, "PNG", optimize=True)
        print(f"Salvo: {path} ({W}x{H})")


if __name__ == "__main__":
    main()
