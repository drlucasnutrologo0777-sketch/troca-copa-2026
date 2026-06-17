"""Gera imagem 1024x1024 para IAP App Store Connect — Liberar Match."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W = H = 1024
OUT = Path.home() / "Desktop" / "match_unlock_promo_1024.png"

# Cores Troca Copa 2026
AZUL = (43, 158, 216)
VERDE = (61, 170, 125)
AMARELO = (245, 197, 24)
VERMELHO = (232, 76, 61)
ROXO = (139, 92, 246)
BRANCO = (255, 255, 255)
ESCURO = (26, 26, 46)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_bg():
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        c = lerp(AZUL, VERDE, t)
        for x in range(W):
            px[x, y] = c
    return img


def circle(draw, cx, cy, r, fill, outline=None, width=0):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill, outline=outline, width=width)


def rounded_rect(draw, xy, radius, fill, outline=None, width=0):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    img = gradient_bg()
    draw = ImageDraw.Draw(img)

    # Círculos decorativos estilo álbum Panini
    decor = [
        (120, 140, 70, VERMELHO),
        (900, 120, 55, AMARELO),
        (880, 880, 80, ROXO),
        (100, 850, 60, AMARELO),
        (500, 60, 40, VERMELHO),
        (960, 500, 45, ROXO),
    ]
    for cx, cy, r, col in decor:
        circle(draw, cx, cy, r, (*col, 180) if len(col) == 3 else col)

    # Cartões de figurinha
    card_w, card_h = 220, 300
    left = (180, 300, 180 + card_w, 300 + card_h)
    right = (624, 300, 624 + card_w, 300 + card_h)
    for box, accent in ((left, AMARELO), (right, VERMELHO)):
        rounded_rect(draw, box, 24, BRANCO, outline=accent, width=8)
        ix1, iy1, ix2, iy2 = box[0] + 20, box[1] + 20, box[2] - 20, box[3] - 80
        rounded_rect(draw, (ix1, iy1, ix2, iy2), 12, accent)
        draw.text((box[0] + 50, box[3] - 55), "FIGURINHA", fill=ESCURO, font=font(22, True))

    # Setas de troca
    mid_y = 450
    draw.polygon([(500, mid_y), (560, mid_y - 28), (560, mid_y - 8), (640, mid_y - 8),
                  (640, mid_y + 8), (560, mid_y + 8), (560, mid_y + 28)], fill=BRANCO)
    draw.polygon([(524, mid_y), (464, mid_y - 28), (464, mid_y - 8), (384, mid_y - 8),
                  (384, mid_y + 8), (464, mid_y + 8), (464, mid_y + 28)], fill=BRANCO)

    # Ícone match (círculo verde + check)
    circle(draw, 512, 430, 58, VERDE, outline=BRANCO, width=6)
    draw.line([(482, 430), (505, 455), (548, 400)], fill=BRANCO, width=10)

    # Título
    draw.text((W // 2, 95), "TROCA COPA 2026", fill=BRANCO, font=font(46, True), anchor="mm")
    draw.text((W // 2, 155), "LIBERAR MATCH", fill=AMARELO, font=font(62, True), anchor="mm")
    draw.text((W // 2, 215), "Match confirmado · Contato e chat", fill=BRANCO, font=font(28), anchor="mm")

    # Botão compra / transação
    btn = (212, 680, 812, 800)
    rounded_rect(draw, btn, 36, AMARELO, outline=BRANCO, width=5)
    draw.text((W // 2, 715), "COMPRAR IN-APP", fill=ESCURO, font=font(44, True), anchor="mm")
    draw.text((W // 2, 765), "Transação segura · App Store", fill=ESCURO, font=font(26), anchor="mm")

    # Ícones unlock (cadeado, chat, telefone simplificados)
    ux, uy = 512, 620
    circle(draw, ux - 120, uy, 36, BRANCO)
    draw.rectangle((ux - 132, uy - 18, ux - 108, uy + 8), outline=VERDE, width=4)
    draw.arc((ux - 138, uy - 38, ux - 102, uy - 10), 0, 180, fill=VERDE, width=4)

    circle(draw, ux, uy, 36, BRANCO)
    rounded_rect(draw, (ux - 22, uy - 12, ux + 22, uy + 18), 10, AZUL)
    draw.ellipse((ux - 10, uy + 2, ux + 10, uy + 14), fill=BRANCO)

    circle(draw, ux + 120, uy, 36, BRANCO)
    rounded_rect(draw, (ux + 98, uy - 16, ux + 142, uy + 22), 8, VERDE)
    draw.ellipse((ux + 108, uy - 8, ux + 132, uy + 8), fill=BRANCO)

    draw.text((W // 2, 870), "com.mycompany.trocafigurinha.match_unlock", fill=BRANCO, font=font(20), anchor="mm")
    draw.text((W // 2, 905), "Compra consumível — um por match", fill=BRANCO, font=font(22), anchor="mm")

    img.save(OUT, "PNG", optimize=True)
    print(f"Salvo: {OUT}")
    print(f"Tamanho: {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    main()
