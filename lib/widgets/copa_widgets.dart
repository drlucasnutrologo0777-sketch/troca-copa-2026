import 'package:flutter/material.dart';
import '../theme/copa_theme.dart';

/// Fundo com gradiente suave e formas discretas (sem estilo de álbum oficial).
class CopaAlbumBackground extends StatelessWidget {
  const CopaAlbumBackground({
    super.key,
    required this.child,
    this.showCapa = false,
  });

  final Widget child;
  final bool showCapa;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        CustomPaint(painter: _FundoAppPainter()),
        SafeArea(child: child),
      ],
    );
  }
}

class _FundoAppPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(0, 0, size.width, size.height);
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            CopaColors.fundoMedio,
            CopaColors.fundoEscuro,
            Color(0xFF172554),
          ],
        ).createShader(rect),
    );

    final blobs = [
      (0.12, 0.08, 0.42, CopaColors.primario),
      (0.88, 0.12, 0.36, CopaColors.roxo),
      (0.05, 0.72, 0.38, CopaColors.destaque),
      (0.78, 0.78, 0.34, CopaColors.secundario),
    ];
    for (final (cx, cy, r, color) in blobs) {
      canvas.drawCircle(
        Offset(size.width * cx, size.height * cy),
        size.width * r,
        Paint()..color = color.withValues(alpha: 0.22),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class CopaCard extends StatelessWidget {
  const CopaCard({
    super.key,
    required this.child,
    this.color,
    this.onTap,
  });

  final Widget child;
  final Color? color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color ?? CopaColors.branco.withValues(alpha: 0.97),
      borderRadius: BorderRadius.circular(20),
      elevation: 6,
      shadowColor: Colors.black26,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(padding: const EdgeInsets.all(16), child: child),
      ),
    );
  }
}

class CopaMenuTopico extends StatelessWidget {
  const CopaMenuTopico({
    super.key,
    required this.titulo,
    required this.onTap,
    this.cor = CopaColors.azul,
    this.destaque = false,
  });

  final String titulo;
  final VoidCallback onTap;
  final Color cor;
  final bool destaque;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: destaque ? cor : CopaColors.branco.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(14),
        elevation: 4,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    titulo,
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      color: destaque ? CopaColors.branco : CopaColors.textoEscuro,
                    ),
                  ),
                ),
                Icon(
                  Icons.chevron_right,
                  color: destaque ? CopaColors.branco : cor,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class CopaBotaoGrande extends StatelessWidget {
  const CopaBotaoGrande({
    super.key,
    required this.emoji,
    required this.titulo,
    required this.subtitulo,
    required this.cor,
    required this.onTap,
  });

  final String emoji;
  final String titulo;
  final String subtitulo;
  final Color cor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return CopaCard(
      color: cor,
      onTap: onTap,
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 36)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titulo,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                    color: CopaColors.branco,
                  ),
                ),
                Text(
                  subtitulo,
                  style: TextStyle(
                    color: CopaColors.branco.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.arrow_forward_ios, color: CopaColors.branco, size: 18),
        ],
      ),
    );
  }
}
