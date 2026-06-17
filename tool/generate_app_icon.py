"""Gera ícone TROCA COPA 2026 (círculos coloridos + 26)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IOS_ICON_DIR = ROOT / "ios" / "Runner" / "Assets.xcassets" / "AppIcon.appiconset"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
DESKTOP = Path.home() / "OneDrive" / "Desktop"
if not DESKTOP.exists():
    DESKTOP = Path.home() / "Desktop"

COLORS = [
    (0xE8, 0x4C, 0x3D),  # vermelho
    (0x3D, 0xAA, 0x7D),  # verde
    (0x2B, 0x9E, 0xD8),  # azul
    (0xF5, 0xC5, 0x18),  # amarelo
    (0x8B, 0x5C, 0xF6),  # roxo
    (0xE8, 0x79, 0xF9),  # rosa
]
BG = (0x12, 0x1A, 0x3A)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG + (255,))
    draw = ImageDraw.Draw(img)
    circles = [
        (0.28, 0.22, 0.38, COLORS[3]),
        (0.62, 0.18, 0.34, COLORS[0]),
        (0.18, 0.52, 0.36, COLORS[2]),
        (0.58, 0.50, 0.40, COLORS[4]),
        (0.35, 0.68, 0.32, COLORS[1]),
        (0.72, 0.70, 0.28, COLORS[5]),
    ]
    for cx, cy, r, color in circles:
        x0 = (cx - r) * size
        y0 = (cy - r) * size
        x1 = (cx + r) * size
        y1 = (cy + r) * size
        overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)
        odraw.ellipse((x0, y0, x1, y1), fill=color + (190,))
        img = Image.alpha_composite(img, overlay)

    draw = ImageDraw.Draw(img)
    font_size = max(12, int(size * 0.28))
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except OSError:
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()

    text = "26"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) // 2
    ty = (size - th) // 2 - int(size * 0.02)
    draw.text((tx + 2, ty + 2), text, fill=(0, 0, 0, 120), font=font)
    draw.text((tx, ty), text, fill=(255, 255, 255, 255), font=font)

    ball_r = max(3, int(size * 0.045))
    bx = tx + tw + ball_r
    by = ty + th - ball_r
    draw.ellipse((bx - ball_r, by - ball_r, bx + ball_r, by + ball_r), fill=(255, 255, 255, 255))
    draw.line((bx - ball_r * 0.6, by, bx + ball_r * 0.6, by), fill=(30, 30, 30, 255), width=max(1, size // 128))
    return img.convert("RGB")


IOS_SIZES = {
    "Icon-App-20x20@2x.png": 40,
    "Icon-App-20x20@3x.png": 60,
    "Icon-App-29x29@1x.png": 29,
    "Icon-App-29x29@2x.png": 58,
    "Icon-App-29x29@3x.png": 87,
    "Icon-App-40x40@2x.png": 80,
    "Icon-App-40x40@3x.png": 120,
    "Icon-App-60x60@2x.png": 120,
    "Icon-App-60x60@3x.png": 180,
    "Icon-App-20x20@1x.png": 20,
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

    app_store = DESKTOP / "TROCA_COPA_icone_1024.png"
    draw_icon(1024).save(app_store, "PNG", optimize=True)
    print("Desktop", app_store)


if __name__ == "__main__":
    main()
