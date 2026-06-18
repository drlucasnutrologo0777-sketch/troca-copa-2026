"""Gera capturas App Store (iPhone + iPad) nos tamanhos exigidos pela Apple."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ASSETS = Path(
    r"C:\Users\drluc\.cursor\projects\c-Users-drluc-Downloads-deficit-calorico-repo-fresh\assets"
)
OUT = Path.home() / "OneDrive" / "Desktop" / "TROCAR_FIGURINHAS_AppStore_Screenshots"
if not OUT.parent.exists():
    OUT = Path.home() / "Desktop" / "TROCAR_FIGURINHAS_AppStore_Screenshots"

BG = (30, 58, 95)  # azul escuro do app

IPHONE = {
    "1242x2688": (1242, 2688),
    "2688x1242": (2688, 1242),
    "1284x2778": (1284, 2778),
    "2778x1284": (2778, 1284),
}

IPAD = {
    "2064x2752": (2064, 2752),
    "2752x2064": (2752, 2064),
    "2048x2732": (2048, 2732),
    "2732x2048": (2732, 2048),
}

# Telas do app (sem TestFlight)
SCREEN_ORDER = [
    "pagina_inicial",
    "pagina_principal_menu",
    "pagina_de_cadastro",
    "pagina_de_troca",
    "pagina_de_macth",
    "pagina_chat",
    "trocas_anteriores",
    "WhatsApp_Image_2026-06-17_at_12.15.23",
    "WhatsApp_Image_2026-06-17_at_12.15.23__1_",
]


def find_sources() -> list[tuple[str, Path]]:
    found: list[tuple[str, Path]] = []
    for key in SCREEN_ORDER:
        matches = sorted(ASSETS.glob(f"*{key}*.png"))
        if not matches:
            print("AVISO: nao achou", key)
            continue
        found.append((key, matches[0]))
    return found


def fit_cover(img: Image.Image, tw: int, th: int) -> Image.Image:
    """Preenche o canvas (crop central se preciso)."""
    canvas = Image.new("RGB", (tw, th), BG)
    scale = max(tw / img.width, th / img.height)
    nw, nh = int(img.width * scale), int(img.height * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (tw - nw) // 2
    y = (th - nh) // 2
    canvas.paste(resized, (x, y))
    return canvas


def fit_contain(img: Image.Image, tw: int, th: int) -> Image.Image:
    """Centraliza sem cortar (barras laterais/superiores)."""
    canvas = Image.new("RGB", (tw, th), BG)
    scale = min(tw / img.width, th / img.height)
    nw, nh = int(img.width * scale), int(img.height * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (tw - nw) // 2
    y = (th - nh) // 2
    canvas.paste(resized, (x, y))
    return canvas


def export_set(img: Image.Image, stem: str, sizes: dict[str, tuple[int, int]], device: str) -> None:
    folder = OUT / device
    folder.mkdir(parents=True, exist_ok=True)
    for label, (w, h) in sizes.items():
        portrait_target = h >= w
        src_portrait = img.height >= img.width
        if portrait_target and src_portrait:
            out = fit_cover(img, w, h)
        elif not portrait_target and src_portrait:
            out = fit_contain(img, w, h)
        else:
            out = fit_cover(img, w, h)
        path = folder / f"{stem}_{label}.png"
        out.save(path, "PNG", optimize=True)
        print(device, path.name)


def main() -> None:
    sources = find_sources()
    if not sources:
        raise SystemExit(f"Nenhuma imagem em {ASSETS}")

    OUT.mkdir(parents=True, exist_ok=True)
    print("Saida:", OUT)
    print("Fontes:", len(sources))

    for i, (key, path) in enumerate(sources, 1):
        img = Image.open(path).convert("RGB")
        stem = f"{i:02d}_{key.split('-')[0].split('images_')[-1][:40]}"
        export_set(img, stem, IPHONE, "iPhone")
        export_set(img, stem, IPAD, "iPad")

    readme = OUT / "LEIA-ME.txt"
    readme.write_text(
        "TROCAR FIGURINHAS — Screenshots App Store\n\n"
        "iPhone/: 1242x2688, 2688x1242, 1284x2778, 2778x1284\n"
        "iPad/: 2064x2752, 2752x2064, 2048x2732, 2732x2048\n\n"
        "Use UM conjunto de tamanho por dispositivo no App Store Connect.\n"
        "Recomendado iPhone: 1284x2778 (retrato) e 2778x1284 (paisagem)\n"
        "Recomendado iPad: 2048x2732 (retrato) e 2732x2048 (paisagem)\n",
        encoding="utf-8",
    )
    print("Pronto:", OUT)


if __name__ == "__main__":
    main()
