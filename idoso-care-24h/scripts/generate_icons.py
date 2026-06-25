"""Gera ícones iOS/Android a partir de assets/images/app_icon.png"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "images" / "app_icon.png"
IOS = ROOT / "ios" / "Runner" / "Assets.xcassets" / "AppIcon.appiconset"

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

ANDROID = {
    "mipmap-mdpi/ic_launcher.png": 48,
    "mipmap-hdpi/ic_launcher.png": 72,
    "mipmap-xhdpi/ic_launcher.png": 96,
    "mipmap-xxhdpi/ic_launcher.png": 144,
    "mipmap-xxxhdpi/ic_launcher.png": 192,
}

WEB = {
    "web/icons/Icon-192.png": 192,
    "web/icons/Icon-512.png": 512,
    "web/icons/Icon-maskable-192.png": 192,
    "web/icons/Icon-maskable-512.png": 512,
    "web/favicon.png": 32,
}


def resize(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.Resampling.LANCZOS)


def main():
    if not SRC.exists():
        raise SystemExit(f"Fonte não encontrada: {SRC}")
    base = Image.open(SRC).convert("RGBA")
    IOS.mkdir(parents=True, exist_ok=True)
    for name, px in IOS_SIZES.items():
        resize(base, px).save(IOS / name, "PNG")
        print("ios", name, px)
    for rel, px in ANDROID.items():
        out = ROOT / "android" / "app" / "src" / "main" / "res" / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        resize(base, px).save(out, "PNG")
        print("android", rel, px)
    for rel, px in WEB.items():
        out = ROOT / rel
        resize(base, px).save(out, "PNG")
        print("web", rel, px)
    print("OK — ícones gerados")


if __name__ == "__main__":
    main()
