"""Gera ícone Trocar Figurinhas — troca de cartas, sem referência a evento esportivo."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
IOS_ICON_DIR = ROOT / "ios" / "Runner" / "Assets.xcassets" / "AppIcon.appiconset"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
DESKTOP = Path.home() / "OneDrive" / "Desktop"
if not DESKTOP.exists():
    DESKTOP = Path.home() / "Desktop"

AZUL = (0x25, 0x63, 0xEB)
VERDE = (0x10, 0xB9, 0x81)
LARANJA = (0xF9, 0x73, 0x16)
FUNDO = (0x0F, 0x17, 0x2A)
BRANCO = (0xFF, 0xFF, 0xFF)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), FUNDO + (255,))
    draw = ImageDraw.Draw(img)

    margin = int(size * 0.08)
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=int(size * 0.22),
        fill=AZUL + (255,),
    )

    card_w = int(size * 0.22)
    card_h = int(size * 0.30)
    left_x = int(size * 0.18)
    right_x = int(size * 0.60)
    card_y = int(size * 0.34)

    draw.rounded_rectangle(
        (left_x, card_y, left_x + card_w, card_y + card_h),
        radius=max(4, size // 32),
        fill=BRANCO + (255,),
    )
    draw.rounded_rectangle(
        (right_x, card_y, right_x + card_w, card_y + card_h),
        radius=max(4, size // 32),
        fill=VERDE + (255,),
    )

    cx = size // 2
    cy = int(size * 0.50)
    arrow = max(6, size // 14)
    draw.polygon(
        [
            (cx - arrow * 2, cy - arrow),
            (cx - arrow // 2, cy - arrow),
            (cx - arrow // 2, cy - arrow * 2),
            (cx + arrow, cy),
            (cx - arrow // 2, cy + arrow * 2),
            (cx - arrow // 2, cy + arrow),
            (cx - arrow * 2, cy + arrow),
        ],
        fill=LARANJA + (255,),
    )
    draw.polygon(
        [
            (cx + arrow * 2, cy - arrow),
            (cx + arrow // 2, cy - arrow),
            (cx + arrow // 2, cy - arrow * 2),
            (cx - arrow, cy),
            (cx + arrow // 2, cy + arrow * 2),
            (cx + arrow // 2, cy + arrow),
            (cx + arrow * 2, cy + arrow),
        ],
        fill=BRANCO + (255,),
    )

    return img.convert("RGB")


IOS_SIZES = {
    "Icon-App-20x20@1x.png": 20,
    "Icon-App-20x20@2x.png": 40,
    "Icon-App-20x20@3x.png": 60,
    "Icon-App-29x29@1x.png": 29,
    "Icon-App-29x29@2x.png": 58,
    "Icon-App-29x29@3x.png": 87,
    "Icon-App-40x40@1x.png": 40,
    "Icon-App-40x40@2x.png": 80,
    "Icon-App-40x40@3x.png": 120,
    "Icon-App-60x60@2x.png": 120,
    "Icon-App-60x60@3x.png": 180,
    "Icon-App-76x76@1x.png": 76,
    "Icon-App-76x76@2x.png": 152,
    "Icon-App-83.5x83.5@2x.png": 167,
    "Icon-App-1024x1024@1x.png": 1024,
}

ANDROID_SIZES = {
    "mipmap-mdpi/ic_launcher.png": 48,
    "mipmap-hdpi/ic_launcher.png": 72,
    "mipmap-xhdpi/ic_launcher.png": 96,
    "mipmap-xxhdpi/ic_launcher.png": 144,
    "mipmap-xxxhdpi/ic_launcher.png": 192,
}


def main() -> None:
    IOS_ICON_DIR.mkdir(parents=True, exist_ok=True)
    for name, px in IOS_SIZES.items():
        out = IOS_ICON_DIR / name
        draw_icon(px).save(out, "PNG", optimize=True)
        print("iOS", name, px)

    for rel, px in ANDROID_SIZES.items():
        folder = ANDROID_RES / rel.split("/")[0]
        folder.mkdir(parents=True, exist_ok=True)
        out = ANDROID_RES / rel
        draw_icon(px).save(out, "PNG", optimize=True)
        print("Android", rel, px)

    app_store = DESKTOP / "TROCAR_FIGURINHAS_icone_1024.png"
    draw_icon(1024).save(app_store, "PNG", optimize=True)
    print("Desktop", app_store)


if __name__ == "__main__":
    main()
