"""Gera screenshots App Store — TROCAR FIGURINHAS (design Build 24).

Saída nos tamanhos exigidos pela Apple:
  iPhone: 1242×2688, 2688×1242, 1284×2778, 2778×1284
  iPad:   2064×2752, 2752×2064, 2048×2732, 2732×2048

Uso:
  python tool/gerar_screenshots_appstore.py
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# --- Igual ao app Flutter (zinc + azul #2563EB) ---
FUNDO = (244, 244, 245)
PRIMARY = (37, 99, 235)
PRIMARY_SOFT = (239, 246, 255)
BRANCO = (255, 255, 255)
CARD = (255, 255, 255)
TEXTO = (24, 24, 27)
TEXTO_SUAVE = (113, 113, 122)
BORDA = (228, 228, 231)
CAMPO = (255, 255, 255)
VERDE = PRIMARY
AZUL = PRIMARY
AMBER = TEXTO_SUAVE
ROXO = PRIMARY
BG_TOP = FUNDO
BG_MID = FUNDO
BG_BOTTOM = FUNDO
PRIMARY_DARK = (29, 78, 216)
PRIMARY_LIGHT = TEXTO_SUAVE
SLATE_BTN = PRIMARY

DESKTOP = Path.home() / "OneDrive" / "Desktop"
if not DESKTOP.exists():
    DESKTOP = Path.home() / "Desktop"
_DATA = datetime.now().strftime("%d-%m-%Y")
_HORA = datetime.now().strftime("%H%M")
OUT = DESKTOP / f"TROCAR_FIGURINHAS_AppStore_{_DATA}_PRO"

IPHONE_SIZES = {
    "1242x2688": (1242, 2688),
    "2688x1242": (2688, 1242),
    "1284x2778": (1284, 2778),
    "2778x1284": (2778, 1284),
}
IPAD_SIZES = {
    "2064x2752": (2064, 2752),
    "2752x2064": (2752, 2064),
    "2048x2732": (2048, 2732),
    "2732x2048": (2732, 2048),
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    paths = (
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]
        if bold
        else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]
    )
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


class Canvas:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.s = w / 1284
        self.img = Image.new("RGB", (w, h), BG_TOP)
        self._gradient()
        self._orbs()
        self.d = ImageDraw.Draw(self.img)

    def px(self, n: float) -> int:
        return int(n * self.s)

    def fs(self, n: int) -> int:
        return max(11, int(n * self.s))

    def _gradient(self) -> None:
        self.img.paste(FUNDO, (0, 0, self.w, self.h))

    def _orbs(self) -> None:
        pass

    def card(self, x0: int, y0: int, x1: int, y1: int, r: int | None = None) -> None:
        r = r or self.px(20)
        self.d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=CARD, outline=BORDA, width=max(1, self.px(1)))

    def title_bar(self, title: str) -> int:
        y = self.px(56)
        self.d.text((self.w // 2, y), title, fill=TEXTO, font=font(self.fs(34), True), anchor="mm")
        return y + self.px(48)

    def field(self, x0: int, y: int, x1: int, label: str, value: str, icon: str = "") -> int:
        h = self.px(56)
        self.d.rounded_rectangle((x0, y, x1, y + h), radius=self.px(14), fill=CAMPO, outline=BORDA, width=1)
        if icon:
            self.d.text((x0 + self.px(18), y + h // 2), icon, fill=AZUL, font=font(self.fs(22)), anchor="lm")
        lx = x0 + (self.px(52) if icon else self.px(18))
        self.d.text((lx, y + self.px(10)), label, fill=TEXTO_SUAVE, font=font(self.fs(18)))
        self.d.text((lx, y + self.px(30)), value, fill=TEXTO, font=font(self.fs(24), True))
        return y + h + self.px(14)

    def btn(self, x0: int, y: int, x1: int, label: str, color: tuple[int, int, int] = PRIMARY) -> int:
        h = self.px(56)
        self.d.rounded_rectangle((x0, y, x1, y + h), radius=self.px(16), fill=color)
        self.d.text((self.w // 2, y + h // 2), label, fill=BRANCO, font=font(self.fs(26), True), anchor="mm")
        return y + h

    def chip(self, x: int, y: int, label: str, selected: bool) -> tuple[int, int]:
        f = font(self.fs(22), selected)
        tw = self.d.textlength(label, font=f)
        pad = self.px(22)
        w, h = int(tw + pad * 2), self.px(44)
        if selected:
            self.d.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=PRIMARY)
            self.d.text((x + w // 2, y + h // 2), label, fill=BRANCO, font=f, anchor="mm")
        else:
            self.d.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=CARD, outline=BORDA, width=1)
            self.d.text((x + w // 2, y + h // 2), label, fill=TEXTO, font=f, anchor="mm")
        return x + w + self.px(10), y

    def radio(self, x: int, y: int, label: str, selected: bool) -> int:
        r = self.px(12)
        cy = y + self.px(16)
        if selected:
            self.d.ellipse((x, cy - r, x + 2 * r, cy + r), fill=PRIMARY)
            self.d.ellipse((x + self.px(5), cy - r + self.px(5), x + 2 * r - self.px(5), cy + r - self.px(5)), fill=BRANCO)
        else:
            self.d.ellipse((x, cy - r, x + 2 * r, cy + r), outline=TEXTO_SUAVE, width=2)
        self.d.text((x + self.px(36), cy), label, fill=TEXTO, font=font(self.fs(24)))
        return y + self.px(44)


def render_login(c: Canvas) -> None:
    y = c.px(120)
    c.d.text((c.w // 2, y), "TROCAR FIGURINHAS", fill=TEXTO, font=font(c.fs(48), True), anchor="mm")
    y += c.px(42)
    disc = "App independente de colecionadores. Não é produto oficial de álbum licenciado."
    c.d.text((c.w // 2, y), disc, fill=(BRANCO[0], BRANCO[1], BRANCO[2]), font=font(c.fs(20)), anchor="mm")
    y += c.px(50)

    bx0, bx1 = c.px(48), c.w - c.px(48)
    bh = c.px(88)
    c.d.rounded_rectangle((bx0, y, bx1, y + bh), radius=c.px(16), outline=PRIMARY, width=3)
    c.d.text((bx0 + c.px(24), y + c.px(32)), "Criar conta", fill=PRIMARY, font=font(c.fs(26), True))
    y += bh + c.px(24)

    tab_h = c.px(52)
    c.card(c.px(40), y, c.w - c.px(40), y + tab_h + c.px(380), r=c.px(16))
    tw = (c.w - c.px(80)) // 3
    for i, (lab, active) in enumerate([("LOGIN", True), ("CADASTRO", False), ("ESQUECI", False)]):
        tx = c.px(40) + i * tw
        if active:
            c.d.rounded_rectangle((tx + 4, y + 4, tx + tw - 4, y + tab_h - 4), radius=c.px(12), fill=PRIMARY)
            c.d.text((tx + tw // 2, y + tab_h // 2), lab, fill=BRANCO, font=font(c.fs(20), True), anchor="mm")
        else:
            c.d.text((tx + tw // 2, y + tab_h // 2), lab, fill=BRANCO, font=font(c.fs(20), True), anchor="mm")
    y += tab_h + c.px(24)

    cx0, cx1 = c.px(40), c.w - c.px(40)
    cy1 = y + c.px(340)
    c.card(cx0, y, cx1, cy1)
    fy = y + c.px(28)
    fy = c.field(cx0 + c.px(20), fy, cx1 - c.px(20), "E-mail", "seu@email.com", "@")
    fy = c.field(cx0 + c.px(20), fy, cx1 - c.px(20), "Senha", "••••••••", "◉")
    c.btn(cx0 + c.px(20), fy + c.px(16), cx1 - c.px(20), "ENTRAR")


def render_home(c: Canvas) -> None:
    y = c.title_bar("TROCAR FIGURINHAS")
    cx0, cx1 = c.px(40), c.w - c.px(40)

    cy1 = y + c.px(72)
    c.card(cx0, y, cx1, cy1)
    c.d.ellipse((cx0 + c.px(20), y + c.px(28), cx0 + c.px(32), y + c.px(40)), fill=PRIMARY_LIGHT)
    c.d.text((cx0 + c.px(44), y + c.px(22)), "Você está visível para trocas", fill=TEXTO, font=font(c.fs(22), True))
    c.d.text((cx0 + c.px(44), y + c.px(48)), "Online · GPS ativo", fill=TEXTO_SUAVE, font=font(c.fs(18)))
    y = cy1 + c.px(16)

    cy1 = y + c.px(96)
    c.card(cx0, y, cx1, cy1)
    c.d.ellipse((cx0 + c.px(20), y + c.px(20), cx0 + c.px(76), y + c.px(76)), fill=CAMPO, outline=BORDA, width=1)
    c.d.text((cx0 + c.px(36), y + c.px(38)), "M", fill=PRIMARY, font=font(c.fs(32), True))
    c.d.text((cx0 + c.px(96), y + c.px(26)), "Maria C.", fill=TEXTO, font=font(c.fs(28), True))
    c.d.text((cx0 + c.px(96), y + c.px(58)), "Montes Claros - MG", fill=TEXTO_SUAVE, font=font(c.fs(20)))
    y = cy1 + c.px(20)

    menus = [
        ("TROCAR FIGURINHA", False),
        ("MINHAS OFERTAS", False),
        ("MATCH", True),
        ("TROCAS ANTERIORES", False),
        ("CHAT", False),
    ]
    for titulo, destaque in menus:
        h = c.px(58)
        if destaque:
            c.d.rounded_rectangle((cx0, y, cx1, y + h), radius=c.px(16), fill=PRIMARY)
            c.d.text((cx0 + c.px(20), y + h // 2), titulo, fill=BRANCO, font=font(c.fs(24), True), anchor="lm")
        else:
            c.card(cx0, y, cx1, y + h, r=c.px(16))
            c.d.text((cx0 + c.px(20), y + h // 2), titulo, fill=TEXTO, font=font(c.fs(24), True), anchor="lm")
            c.d.text((cx1 - c.px(20), y + h // 2), "›", fill=PRIMARY, font=font(c.fs(28), True), anchor="rm")
        y += h + c.px(10)


def render_match(c: Canvas) -> None:
    y = c.title_bar("Match")
    cx0, cx1 = c.px(40), c.w - c.px(40)

    cy1 = y + c.px(280)
    c.card(cx0, y, cx1, cy1)
    c.d.text((cx0 + c.px(20), y + c.px(20)), "Aceite mútuo entre colecionadores", fill=TEXTO, font=font(c.fs(26), True))
    c.d.text(
        (cx0 + c.px(20), y + c.px(54)),
        "Um colecionador por vez. A compra in-app só aparece após os dois aceitarem.",
        fill=TEXTO_SUAVE,
        font=font(c.fs(20)),
    )
    fy = y + c.px(96)
    fy = c.field(cx0 + c.px(20), fy, cx1 - c.px(20), "Cidade", "Montes Claros", "⌂")
    fy = c.field(cx0 + c.px(20), fy, cx1 - c.px(20), "Estado (UF)", "MG", "▣")
    c.d.text((cx0 + c.px(20), fy + c.px(8)), "Raio de busca", fill=TEXTO, font=font(c.fs(22), True))
    fx = cx0 + c.px(20)
    fy += c.px(40)
    for km in ("1 km", "5 km", "10 km", "30 km", "50 km"):
        fx, _ = c.chip(fx, fy, km, km == "50 km")
    y = cy1 + c.px(16)

    cy1 = y + c.px(200)
    c.card(cx0, y, cx1, cy1)
    c.d.text((cx0 + c.px(20), y + c.px(16)), "Tipo de busca", fill=TEXTO, font=font(c.fs(24), True))
    ry = y + c.px(52)
    ry = c.radio(cx0 + c.px(20), ry, "Figurinha específica", False)
    ry = c.radio(cx0 + c.px(20), ry, "Qualquer jogador de um país", False)
    c.radio(cx0 + c.px(20), ry, "Qualquer figurinha que ainda não possuo", True)
    y = cy1 + c.px(24)
    c.btn(cx0, y, cx1, "BUSCAR COLECIONADORES")


def render_match_deck(c: Canvas) -> None:
    y = c.title_bar("Match · 1 de 3")
    cx0, cx1 = c.px(40), c.w - c.px(40)
    cy1 = y + c.px(420)
    c.d.rounded_rectangle((cx0, y, cx1, cy1), radius=c.px(20), fill=PRIMARY)
    c.d.text((cx0 + c.px(24), y + c.px(28)), "João S.", fill=BRANCO, font=font(c.fs(36), True))
    c.d.text((cx0 + c.px(24), y + c.px(72)), "● Online · Montes Claros", fill=(220, 230, 255), font=font(c.fs(20)))
    c.d.text((cx0 + c.px(24), y + c.px(104)), "12,4 km de distância", fill=BRANCO, font=font(c.fs(24), True))

    bx0, bx1 = cx0 + c.px(16), cx1 - c.px(16)
    by = y + c.px(148)
    bh = c.px(100)
    c.d.rounded_rectangle((bx0, by, bx1, by + bh), radius=c.px(14), fill=PRIMARY_DARK)
    c.d.text((bx0 + c.px(16), by + c.px(14)), "Possui para troca", fill=BRANCO, font=font(c.fs(20), True))
    c.d.text((bx0 + c.px(16), by + c.px(44)), "• Nº 142 · Figurinha repetida", fill=BRANCO, font=font(c.fs(18)))
    by += bh + c.px(12)
    c.d.rounded_rectangle((bx0, by, bx1, by + bh), radius=c.px(14), fill=PRIMARY_DARK)
    c.d.text((bx0 + c.px(16), by + c.px(14)), "Precisa", fill=BRANCO, font=font(c.fs(20), True))
    c.d.text((bx0 + c.px(16), by + c.px(44)), "• Qualquer figurinha · Catálogo A", fill=BRANCO, font=font(c.fs(18)))

    y = cy1 + c.px(32)
    bw = (cx1 - cx0 - c.px(16)) // 2
    c.d.rounded_rectangle((cx0, y, cx0 + bw, y + c.px(56)), radius=c.px(16), outline=PRIMARY_LIGHT, width=3)
    c.d.text((cx0 + bw // 2, y + c.px(28)), "RECUSAR", fill=PRIMARY_LIGHT, font=font(c.fs(24), True), anchor="mm")
    c.d.rounded_rectangle((cx1 - bw, y, cx1, y + c.px(56)), radius=c.px(16), fill=PRIMARY)
    c.d.text((cx1 - bw // 2, y + c.px(28)), "ACEITAR", fill=BRANCO, font=font(c.fs(24), True), anchor="mm")


def render_trade(c: Canvas) -> None:
    y = c.title_bar("Trocar Figurinha")
    cx0, cx1 = c.px(40), c.w - c.px(40)
    cy1 = y + c.px(120)
    c.card(cx0, y, cx1, cy1)
    c.d.text((cx0 + c.px(20), y + c.px(20)), "O que você oferece", fill=TEXTO, font=font(c.fs(24), True))
    c.d.text((cx0 + c.px(20), y + c.px(54)), "Toque nas figurinhas abaixo", fill=TEXTO_SUAVE, font=font(c.fs(18)))
    chips = ["Nº 88 · Repetida", "Nº 142 · Repetida"]
    fx = cx0 + c.px(20)
    fy = y + c.px(78)
    for ch in chips:
        fx, _ = c.chip(fx, fy, ch, False)
    y = cy1 + c.px(16)

    cy1 = y + c.px(520)
    c.card(cx0, y, cx1, cy1)
    c.d.text((cx0 + c.px(20), y + c.px(16)), "Catálogo", fill=TEXTO, font=font(c.fs(26), True))
    items = [("Grupo A", PRIMARY), ("Grupo B", PRIMARY_DARK), ("Grupo C", PRIMARY_LIGHT)]
    iy = y + c.px(56)
    for lab, col in items:
        ih = c.px(52)
        c.d.rounded_rectangle((cx0 + c.px(16), iy, cx1 - c.px(16), iy + ih), radius=c.px(14), fill=col)
        c.d.text((cx0 + c.px(36), iy + ih // 2), lab, fill=BRANCO, font=font(c.fs(24), True), anchor="lm")
        iy += ih + c.px(10)


RENDERERS = {
    "01_login": render_login,
    "02_home_menu": render_home,
    "03_match_busca": render_match,
    "04_match_deck": render_match_deck,
    "05_trocar_figurinha": render_trade,
}


def render_screen(name: str, w: int, h: int) -> Image.Image:
    c = Canvas(w, h)
    RENDERERS[name](c)
    bar_y = h - c.px(28)
    c.d.rounded_rectangle((w // 2 - c.px(60), bar_y, w // 2 + c.px(60), bar_y + c.px(6)), radius=3, fill=BRANCO)
    return c.img


def fit_to_size(img: Image.Image, tw: int, th: int) -> Image.Image:
    """Escala proporcional preenchendo o canvas (crop central se necessário)."""
    canvas = Image.new("RGB", (tw, th), BG_TOP)
    scale = max(tw / img.width, th / img.height)
    nw, nh = int(img.width * scale), int(img.height * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    x, y = (tw - nw) // 2, (th - nh) // 2
    canvas.paste(resized, (x, y))
    return canvas


def export_all(base: Image.Image, stem: str) -> None:
    for device, sizes in (("iPhone", IPHONE_SIZES), ("iPad", IPAD_SIZES)):
        folder = OUT / device
        folder.mkdir(parents=True, exist_ok=True)
        for label, (w, h) in sizes.items():
            out = fit_to_size(base, w, h)
            path = folder / f"{stem}_{label}.png"
            out.save(path, "PNG", optimize=True)
            print(f"  {device}/{path.name}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    master_w, master_h = 1284, 2778
    print("Gerando screenshots App Store — design Build 24")
    print("Pasta:", OUT)
    print()

    for name in RENDERERS:
        print(name)
        img = render_screen(name, master_w, master_h)
        preview = OUT / "preview" / f"{name}.png"
        preview.parent.mkdir(parents=True, exist_ok=True)
        img.save(preview, "PNG", optimize=True)
        export_all(img, name)

    readme = OUT / "LEIA-ME.txt"
    readme.write_text(
        f"TROCAR FIGURINHAS — Screenshots App Store (Build 24)\n"
        f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}\n\n"
        "preview/ — imagens mestre 1284×2778 para conferência\n\n"
        "iPhone/\n"
        "  1242×2688, 2688×1242, 1284×2778, 2778×1284\n\n"
        "iPad/\n"
        "  2064×2752, 2752×2064, 2048×2732, 2732×2048\n\n"
        "No App Store Connect, use UM conjunto por dispositivo:\n"
        "  iPhone retrato recomendado: 1284×2778\n"
        "  iPad retrato recomendado: 2048×2732\n\n"
        "IMPORTANTE: telas sem preço (R$) — conforme Guideline 2.3.7\n",
        encoding="utf-8",
    )
    print()
    print("Pronto! Abra a pasta preview/ para ver antes de enviar.")


if __name__ == "__main__":
    main()
