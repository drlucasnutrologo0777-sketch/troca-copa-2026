"""Gera ícone Trocar Figurinhas — verde + símbolo de troca (sem FIFA/Panini/26)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IOS_ICON_DIR = ROOT / "ios" / "Runner" / "Assets.xcassets" / "AppIcon.appiconset"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
LAUNCH_DIR = ROOT / "ios" / "Runner" / "Assets.xcassets" / "LaunchImage.imageset"
DESKTOP = Path.home() / "OneDrive" / "Desktop"
if not DESKTOP.exists():
    DESKTOP = Path.home() / "Desktop"

BG = (0x2E, 0x7D, 0x52)
BG_DARK = (0x1A, 0x4D, 0x32)
WHITE = (255, 255, 255)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG + (255,))
    draw = ImageDraw.Draw(img)
    margin = int(size * 0.08)
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=int(size * 0.18),
        fill=BG_DARK + (255,),
    )

    cx, cy = size // 2, size // 2
    arrow = int(size * 0.14)
    gap = int(size * 0.06)
    lw = max(2, size // 32)

    # Setas de troca (↔)
    draw.line((cx - arrow, cy - gap, cx + arrow, cy - gap), fill=WHITE, width=lw)
    draw.polygon(
        [(cx + arrow, cy - gap), (cx + arrow - lw * 3, cy - gap - lw * 2), (cx + arrow - lw * 3, cy - gap + lw * 2)],
        fill=WHITE,
    )
    draw.polygon(
        [(cx - arrow, cy - gap), (cx - arrow + lw * 3, cy - gap - lw * 2), (cx - arrow + lw * 3, cy - gap + lw * 2)],
        fill=WHITE,
    )

    draw.line((cx - arrow, cy + gap, cx + arrow, cy + gap), fill=WHITE, width=lw)
    draw.polygon(
        [(cx - arrow, cy + gap), (cx - arrow + lw * 3, cy + gap - lw * 2), (cx - arrow + lw * 3, cy + gap + lw * 2)],
        fill=WHITE,
    )
    draw.polygon(
        [(cx + arrow, cy + gap), (cx + arrow - lw * 3, cy + gap - lw * 2), (cx + arrow - lw * 3, cy + gap + lw * 2)],
        fill=WHITE,
    )

    if size >= 128:
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", max(10, int(size * 0.09)))
        except OSError:
            font = ImageFont.load_default()
        text = "TF"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((size - tw) // 2, int(size * 0.68)), text, fill=WHITE, font=font)

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

    LAUNCH_DIR.mkdir(parents=True, exist_ok=True)
    launch = draw_icon(512)
    launch.save(LAUNCH_DIR / "LaunchImage.png", "PNG", optimize=True)
    launch.save(LAUNCH_DIR / "LaunchImage@2x.png", "PNG", optimize=True)
    launch.save(LAUNCH_DIR / "LaunchImage@3x.png", "PNG", optimize=True)
    print("LaunchImage OK")

    app_store = DESKTOP / "TROCAR_FIGURINHAS_icone_1024.png"
    draw_icon(1024).save(app_store, "PNG", optimize=True)
    print("Desktop", app_store)


if __name__ == "__main__":
    main()
