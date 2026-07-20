"""Gera capturas App Store (iPhone/iPad), logo e simulação serviço aceito — Idoso Care 24H."""
from __future__ import annotations

import textwrap
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WORKSPACE = Path(r"C:\Users\drluc\Downloads\deficit_calorico\repo_fresh")
ASSETS_SRC = Path(
    r"C:\Users\drluc\.cursor\projects\c-Users-drluc-Downloads-deficit-calorico-repo-fresh\assets"
)

GREEN = (46, 139, 87)
GREEN_D = (38, 122, 76)
SOFT = (245, 247, 250)
WHITE = (255, 255, 255)
TEXT = (45, 45, 45)
MUTED = (102, 102, 102)
GOLD = (212, 175, 55)
BLUE = (30, 136, 229)

IPHONE_SIZES = [
    (1242, 2688),
    (1284, 2778),
]
IPHONE_LANDSCAPE = [(w, h) for h, w in IPHONE_SIZES]

IPAD_SIZES = [
    (2048, 2732),
    (2064, 2752),
]
IPAD_LANDSCAPE = [(w, h) for h, w in IPAD_SIZES]

SCREENSHOTS = [
    ("01_area_cuidador", "menu_cuidador_1-9b7e4ab2-2b7c-4545-becb-6e833967b211.png"),
    ("02_menu_cuidador", "menu_cuidador-e1b4a04b-c51b-4b12-b4cc-2f15206bb9ea.png"),
    ("03_cuidadores_proximos", "cuidadores_perto_-b648edae-3bec-4154-be44-01404780babc.png"),
    ("04_disponibilizar_agenda", "disponibilizar_agenda-5b48b95c-b7ef-4a28-813b-57b6da9ce0f3.png"),
    ("05_oferecer_plantao", "oferecer_plantao_cuidador-eb09ded7-0e6c-4365-bf58-553ddc88a259.png"),
    ("06_cartao_ponto", "cartao_de_ponto_-f4eda27f-58f4-4fbe-aabc-ab7a5a9f3e50.png"),
    ("07_diario_paciente", "diario_do_paciente-0348f4ab-5032-4616-a980-1eb64adaf10a.png"),
    ("08_faturamento", "faturamento_cuidador-30f9ed4f-dbc4-425b-aaec-4c40ffc62d4b.png"),
    ("09_taxa_app", "taxa_app-b1f3bd2d-2bc1-4c38-aa59-3f3c9eaf50e2.png"),
    ("10_recomendacoes", "recomenda_oes_familiares-1ec82eab-4fac-4e63-bfde-6e14f1d86cdb.png"),
    ("11_area_contratante", "menu_cliente-b71a9a53-0f1c-4435-bc36-5ca7a7030198.png"),
    ("12_menu_contratante", "menu_cliente_2-91d8fb48-1fa3-4068-987b-4d3c8d83f465.png"),
    ("13_plantao_urgente", "f-oferta_plantao_cliente-abb9970b-223c-498e-b74c-f83c544770c0.png"),
    ("14_historico", "historico_cuidador-b4b05193-b8a7-432c-b4b8-526d63efc3c5.png"),
    ("15_curriculo", "curriculo-1556912e-6dd8-4346-a401-cbb2e80819b0.png"),
]

IPAD_PICK = SCREENSHOTS[:10]

PREVIEW_SLIDES = [
    {
        "title": "Cuidadores certificados",
        "subtitle": "Encontre profissionais próximos\ndisponíveis para plantão hoje",
        "screens": ["01_area_cuidador", "03_cuidadores_proximos"],
    },
    {
        "title": "Plantão com segurança",
        "subtitle": "Cartão de ponto, diário do paciente\ne faturamento transparente",
        "screens": ["06_cartao_ponto", "07_diario_paciente"],
    },
    {
        "title": "Família conectada",
        "subtitle": "Ofertas, chat após fechar negócio\ne acompanhamento em tempo real",
        "screens": ["11_area_contratante", "13_plantao_urgente"],
    },
]


def find_asset(filename_suffix: str) -> Path:
    matches = list(ASSETS_SRC.glob(f"*{filename_suffix}"))
    if not matches:
        raise FileNotFoundError(f"Asset não encontrado: {filename_suffix} em {ASSETS_SRC}")
    return matches[0]


def load_screens() -> dict[str, Image.Image]:
    out: dict[str, Image.Image] = {}
    for key, suffix in SCREENSHOTS:
        path = find_asset(suffix)
        out[key] = Image.open(path).convert("RGB")
    return out


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def crop_fill(img: Image.Image, tw: int, th: int) -> Image.Image:
    sw, sh = img.size
    target_ratio = tw / th
    src_ratio = sw / sh
    if src_ratio > target_ratio:
        new_w = int(sh * target_ratio)
        left = (sw - new_w) // 2
        box = (left, 0, left + new_w, sh)
    else:
        new_h = int(sw / target_ratio)
        top = (sh - new_h) // 2
        box = (0, top, sw, top + new_h)
    return img.crop(box).resize((tw, th), Image.Resampling.LANCZOS)


def ipad_compose(img: Image.Image, tw: int, th: int) -> Image.Image:
    canvas = Image.new("RGB", (tw, th), SOFT)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, tw, int(th * 0.08)], fill=GREEN)
    draw.text((tw // 2, int(th * 0.04)), "Idoso Care 24H", fill=WHITE, font=font(int(th * 0.022), True), anchor="mm")

    max_w = int(tw * 0.52)
    max_h = int(th * 0.78)
    sw, sh = img.size
    scale = min(max_w / sw, max_h / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (tw - nw) // 2
    y = int(th * 0.12) + (max_h - nh) // 2
    canvas.paste(resized, (x, y))
    return canvas


def draw_rounded_rect(draw: ImageDraw.ImageDraw, box, radius: int, fill):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def create_logo(size: int = 1024) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = int(size * 0.08)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.18), fill=GREEN)

    inner = int(size * 0.22)
    draw.ellipse([size // 2 - inner, size // 2 - inner - int(size * 0.06), size // 2 + inner, size // 2 + inner - int(size * 0.06)], fill=WHITE)
    draw.rounded_rectangle(
        [size // 2 - int(size * 0.28), size // 2 + int(size * 0.02), size // 2 + int(size * 0.28), size // 2 + int(size * 0.34)],
        radius=int(size * 0.12),
        fill=WHITE,
    )

    f = font(int(size * 0.11), True)
    draw.text((size // 2, int(size * 0.78)), "24H", fill=WHITE, font=f, anchor="mm")
    return img


def create_logo_print(tw: int, th: int) -> Image.Image:
    canvas = Image.new("RGB", (tw, th), SOFT)
    draw = ImageDraw.Draw(canvas)
    logo = create_logo(int(min(tw, th) * 0.35)).convert("RGB")
    lx = (tw - logo.width) // 2
    ly = int(th * 0.28)
    canvas.paste(logo, (lx, ly), create_logo(int(min(tw, th) * 0.35)).split()[3])

    draw.text((tw // 2, int(th * 0.62)), "Idoso Care 24H", fill=GREEN, font=font(int(th * 0.045), True), anchor="mm")
    draw.text(
        (tw // 2, int(th * 0.67)),
        "Cuidadores de idosos com\nsegurança e confiança",
        fill=MUTED,
        font=font(int(th * 0.024)),
        anchor="mm",
        align="center",
    )
    draw.text((tw // 2, int(th * 0.78)), "com.idosocare24h.app", fill=BLUE, font=font(int(th * 0.022)), anchor="mm")
    return canvas


def create_servico_aceito(tw: int, th: int) -> Image.Image:
    canvas = Image.new("RGB", (tw, th), SOFT)
    draw = ImageDraw.Draw(canvas)
    header_h = int(th * 0.11)
    draw.rectangle([0, 0, tw, header_h], fill=GREEN)
    draw.text((int(tw * 0.08), int(header_h * 0.5)), "←", fill=WHITE, font=font(int(th * 0.035)), anchor="lm")
    draw.text((tw // 2, int(header_h * 0.5)), "Negócio fechado", fill=WHITE, font=font(int(th * 0.028), True), anchor="mm")

    cy = int(th * 0.22)
    r = int(tw * 0.12)
    draw.ellipse([tw // 2 - r, cy - r, tw // 2 + r, cy + r], fill=(76, 175, 80))
    draw.line([tw // 2 - int(r * 0.35), cy, tw // 2 - int(r * 0.05), cy + int(r * 0.3)], fill=WHITE, width=max(4, tw // 120))
    draw.line([tw // 2 - int(r * 0.05), cy + int(r * 0.3), tw // 2 + int(r * 0.38), cy - int(r * 0.28)], fill=WHITE, width=max(4, tw // 120))

    draw.text((tw // 2, int(th * 0.34)), "Plantão confirmado!", fill=TEXT, font=font(int(th * 0.034), True), anchor="mm")
    draw.text(
        (tw // 2, int(th * 0.39)),
        "Ana Demo Cuidadora aceitou sua proposta\nde 15 dias para receber a diária ao fim do dia",
        fill=MUTED,
        font=font(int(th * 0.022)),
        anchor="mm",
        align="center",
    )

    card_x = int(tw * 0.08)
    card_w = tw - 2 * card_x
    cards = [
        ("Família", "Carlos Demo Família"),
        ("Valor diária", "R$ 250,00"),
        ("Duração", "15 dias"),
        ("Forma de recebimento", "Diária ao fim do plantão"),
        ("Local", "Montes Claros — MG"),
        ("Chat", "✅ Liberado após fechar negócio"),
    ]
    y = int(th * 0.46)
    for label, value in cards:
        h = int(th * 0.065)
        draw_rounded_rect(draw, [card_x, y, card_x + card_w, y + h], int(th * 0.012), WHITE)
        draw.text((card_x + int(tw * 0.04), y + int(h * 0.28)), label, fill=MUTED, font=font(int(th * 0.018)))
        draw.text((card_x + int(tw * 0.04), y + int(h * 0.58)), value, fill=TEXT, font=font(int(th * 0.022), True))
        y += h + int(th * 0.012)

    btn_h = int(th * 0.055)
    btn_y = th - int(th * 0.14)
    draw_rounded_rect(draw, [card_x, btn_y, card_x + card_w, btn_y + btn_h], int(th * 0.014), GREEN)
    draw.text((tw // 2, btn_y + btn_h // 2), "Abrir chat com cuidador", fill=WHITE, font=font(int(th * 0.024), True), anchor="mm")

    note_y = btn_y - int(th * 0.06)
    draw_rounded_rect(draw, [card_x, note_y - int(th * 0.04), card_x + card_w, note_y + int(th * 0.02)], int(th * 0.01), (255, 243, 224))
    draw.text(
        (card_x + int(tw * 0.04), note_y - int(th * 0.02)),
        "Cancelamento após fechar: multa 7% (3,5% + 3,5%)",
        fill=(180, 120, 0),
        font=font(int(th * 0.017)),
    )
    return canvas


def create_excluir_conta(tw: int, th: int) -> Image.Image:
    canvas = Image.new("RGB", (tw, th), SOFT)
    draw = ImageDraw.Draw(canvas)
    header_h = int(th * 0.11)
    draw.rectangle([0, 0, tw, header_h], fill=GREEN)
    draw.text((int(tw * 0.08), int(header_h * 0.5)), "←", fill=WHITE, font=font(int(th * 0.035)), anchor="lm")
    draw.text((tw // 2, int(header_h * 0.5)), "Excluir conta", fill=WHITE, font=font(int(th * 0.028), True), anchor="mm")

    pad = int(tw * 0.08)
    warn_h = int(th * 0.12)
    draw_rounded_rect(draw, [pad, int(th * 0.14), tw - pad, int(th * 0.14) + warn_h], int(th * 0.012), (254, 242, 242))
    draw.rectangle([pad, int(th * 0.14), pad + 5, int(th * 0.14) + warn_h], fill=(211, 47, 47))
    draw.text(
        (pad + int(tw * 0.04), int(th * 0.165)),
        "Exclusão permanente. Sua conta, perfil, documentos,\nchats e dados pessoais serão apagados. Não pode ser desfeita.",
        fill=(120, 40, 40),
        font=font(int(th * 0.019)),
    )

    y = int(th * 0.30)
    draw.text((pad, y), "Confirme com sua senha", fill=TEXT, font=font(int(th * 0.02), True))
    y += int(th * 0.035)
    draw_rounded_rect(draw, [pad, y, tw - pad, y + int(th * 0.055)], int(th * 0.012), WHITE)
    draw.text((pad + int(tw * 0.04), y + int(th * 0.018)), "••••••••", fill=MUTED, font=font(int(th * 0.022)))

    y += int(th * 0.08)
    box = int(th * 0.022)
    draw.rectangle([pad, y + 2, pad + box, y + 2 + box], outline=TEXT, width=2)
    draw.line([pad + 4, y + 2 + box // 2, pad + box - 4, y + 2 + box - 3], fill=TEXT, width=2)
    draw.text(
        (pad + box + 10, y),
        "Entendo que a exclusão é permanente e desejo\napagar minha conta.",
        fill=TEXT,
        font=font(int(th * 0.019)),
    )

    btn_h = int(th * 0.055)
    btn_y = y + int(th * 0.09)
    draw_rounded_rect(draw, [pad, btn_y, tw - pad, btn_y + btn_h], int(th * 0.014), (211, 47, 47))
    draw.text((tw // 2, btn_y + btn_h // 2), "Apagar conta permanentemente", fill=WHITE, font=font(int(th * 0.022), True), anchor="mm")

    btn2_y = btn_y + btn_h + int(th * 0.018)
    draw_rounded_rect(draw, [pad, btn2_y, tw - pad, btn2_y + btn_h], int(th * 0.014), WHITE)
    draw.text((tw // 2, btn2_y + btn_h // 2), "Sair da conta (sem apagar)", fill=GREEN, font=font(int(th * 0.021), True), anchor="mm")

    draw.text((tw // 2, th - int(th * 0.06)), "Política de privacidade · Termos de uso", fill=MUTED, font=font(int(th * 0.016)), anchor="mm")
    return canvas


def create_preview(screens: dict[str, Image.Image], slide: dict, tw: int, th: int) -> Image.Image:
    canvas = Image.new("RGB", (tw, th), GREEN_D)
    draw = ImageDraw.Draw(canvas)
    draw.text((int(tw * 0.06), int(th * 0.12)), slide["title"], fill=WHITE, font=font(int(th * 0.08), True))
    for i, line in enumerate(slide["subtitle"].split("\n")):
        draw.text((int(tw * 0.06), int(th * 0.24) + i * int(th * 0.06)), line, fill=(220, 240, 228), font=font(int(th * 0.035)))

    keys = slide["screens"]
    phone_h = int(th * 0.72)
    gap = int(tw * 0.04)
    total_w = 0
    resized_list = []
    for key in keys:
        img = screens[key]
        scale = phone_h / img.size[1]
        nw = int(img.size[0] * scale)
        resized_list.append(img.resize((nw, phone_h), Image.Resampling.LANCZOS))
        total_w += nw
    total_w += gap * (len(resized_list) - 1)
    x = tw - total_w - int(tw * 0.05)
    y = (th - phone_h) // 2
    for im in resized_list:
        shadow = Image.new("RGB", (im.width + 20, im.height + 20), (20, 80, 50))
        canvas.paste(shadow, (x - 10, y - 5))
        canvas.paste(im, (x, y))
        x += im.width + gap

    logo = create_logo(int(th * 0.12)).convert("RGB")
    canvas.paste(logo, (int(tw * 0.06), int(th * 0.78)), create_logo(int(th * 0.12)).split()[3])
    draw.text((int(tw * 0.06) + int(th * 0.14), int(th * 0.82)), "Idoso Care 24H", fill=WHITE, font=font(int(th * 0.035), True))
    return canvas


def save_all_sizes(img: Image.Image, base_path: Path, sizes: list[tuple[int, int]], ipad: bool = False):
    for w, h in sizes:
        folder = base_path.parent / f"{w}x{h}"
        folder.mkdir(parents=True, exist_ok=True)
        out = ipad_compose(img, w, h) if ipad else crop_fill(img, w, h)
        out.save(folder / base_path.name, "PNG", optimize=True)


def main() -> int:
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M")
    out_root = WORKSPACE / f"AppStore-IdosoCare24H_{ts}"
    out_root.mkdir(parents=True, exist_ok=True)

    screens = load_screens()
    (out_root / "logo").mkdir(exist_ok=True)
    create_logo(1024).save(out_root / "logo" / "logo_1024x1024.png")

    for w, h in IPHONE_SIZES:
        create_logo_print(w, h).save(out_root / "logo" / f"logo_print_{w}x{h}.png", "PNG", optimize=True)

    all_portrait = IPHONE_SIZES + IPAD_SIZES
    all_landscape = IPHONE_LANDSCAPE + IPAD_LANDSCAPE
    for w, h in all_portrait + all_landscape:
        folder = out_root / "servico_aceito" / f"{w}x{h}"
        folder.mkdir(parents=True, exist_ok=True)
        create_servico_aceito(w, h).save(folder / "servico_aceito.png", "PNG", optimize=True)

    for w, h in IPHONE_SIZES:
        folder = out_root / "excluir_conta" / f"{w}x{h}"
        folder.mkdir(parents=True, exist_ok=True)
        create_excluir_conta(w, h).save(folder / "excluir_conta_permanente.png", "PNG", optimize=True)

    iphone_dir = out_root / "iphone"
    for key, _ in SCREENSHOTS:
        img = screens[key]
        for w, h in IPHONE_SIZES + IPHONE_LANDSCAPE:
            folder = iphone_dir / f"{w}x{h}"
            folder.mkdir(parents=True, exist_ok=True)
            crop_fill(img, w, h).save(folder / f"{key}.png", "PNG", optimize=True)

    ipad_dir = out_root / "ipad"
    for key, _ in IPAD_PICK:
        img = screens[key]
        for w, h in IPAD_SIZES + IPAD_LANDSCAPE:
            folder = ipad_dir / f"{w}x{h}"
            folder.mkdir(parents=True, exist_ok=True)
            ipad_compose(img, w, h).save(folder / f"{key}.png", "PNG", optimize=True)

    preview_dir = out_root / "previews"
    for i, slide in enumerate(PREVIEW_SLIDES, 1):
        for w, h in IPHONE_LANDSCAPE + IPAD_LANDSCAPE:
            folder = preview_dir / f"preview_{i:02d}_{w}x{h}"
            folder.mkdir(parents=True, exist_ok=True)
            create_preview(screens, slide, w, h).save(folder / f"preview_{i:02d}.png", "PNG", optimize=True)

    readme = textwrap.dedent(
        f"""\
        Idoso Care 24H — Assets App Store
        Gerado em: {datetime.now().strftime("%d/%m/%Y %H:%M")}

        Estrutura:
        - logo/ — ícone 1024×1024 + prints marketing
        - servico_aceito/ — simulação negócio fechado (todas resoluções)
        - iphone/ — {len(SCREENSHOTS)} telas × {len(IPHONE_SIZES)} tamanhos
        - ipad/ — 10 telas × {len(IPAD_SIZES)} tamanhos (12,9"/13")
        - previews/ — 3 pré-visualizações landscape

        Resoluções iPhone: 1242×2688, 1284×2778 (+ landscape espelhado)
        Resoluções iPad: 2048×2732, 2064×2752 (+ landscape espelhado)

        App Store Connect:
        https://appstoreconnect.apple.com/apps/6784357547/distribution/ios/version/inflight
        """
    )
    (out_root / "LEIA-ME.txt").write_text(readme, encoding="utf-8")

    print(f"OK — pasta: {out_root}")
    print(f"  iPhone: {len(SCREENSHOTS)} telas")
    print(f"  iPad: {len(IPAD_PICK)} telas")
    print(f"  Previews: {len(PREVIEW_SLIDES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
