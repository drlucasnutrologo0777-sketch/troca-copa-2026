import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/copa_theme.dart';

class CopaAlbumBackground extends StatelessWidget {
  const CopaAlbumBackground({
    super.key,
    required this.child,
    /// Paleta alternativa (ex.: tela de login). Sem foto de álbum.
    this.circlePalette,
  });

  final Widget child;
  final List<Color>? circlePalette;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        CustomPaint(painter: _CirculosPaniniPainter(palette: circlePalette)),
        SafeArea(child: child),
      ],
    );
  }
}

class _CirculosPaniniPainter extends CustomPainter {
  _CirculosPaniniPainter({this.palette});

  final List<Color>? palette;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = const Color(0xFF1E3A5F),
    );
    final cores = palette ?? CopaColors.circulos;
    final rnd = math.Random(26);
    for (var i = 0; i < 18; i++) {
      final color = cores[i % cores.length];
      final r = size.width * (0.18 + rnd.nextDouble() * 0.22);
      final cx = rnd.nextDouble() * size.width;
      final cy = rnd.nextDouble() * size.height;
      canvas.drawCircle(Offset(cx, cy), r, Paint()..color = color.withValues(alpha: 0.85));
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
      color: color ?? CopaColors.branco.withValues(alpha: 0.95),
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
