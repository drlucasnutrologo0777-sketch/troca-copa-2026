import 'package:flutter/material.dart';
import '../theme/copa_theme.dart';

/// Fundo neutro em todas as telas (sem círculos coloridos).
class CopaAlbumBackground extends StatelessWidget {
  const CopaAlbumBackground({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            CopaColors.fundo,
            Color(0xFF455A64),
            Color(0xFF546E7A),
          ],
        ),
      ),
      child: SafeArea(child: child),
    );
  }
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
      color: color ?? CopaColors.branco.withValues(alpha: 0.98),
      borderRadius: BorderRadius.circular(20),
      elevation: 4,
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
    this.cor = CopaColors.primary,
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
        color: destaque ? cor : CopaColors.branco.withValues(alpha: 0.98),
        borderRadius: BorderRadius.circular(14),
        elevation: 3,
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
