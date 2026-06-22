import 'package:flutter/material.dart';
import '../theme/copa_theme.dart';

/// Fundo claro uniforme — sem gradiente escuro nem orbes coloridos.
class CopaAlbumBackground extends StatelessWidget {
  const CopaAlbumBackground({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: CopaColors.fundo,
      child: SafeArea(child: child),
    );
  }
}

/// AppBar padrão de todas as telas internas.
class CopaAppBar extends StatelessWidget implements PreferredSizeWidget {
  const CopaAppBar({
    super.key,
    required this.title,
    this.actions,
  });

  final String title;
  final List<Widget>? actions;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title),
      actions: actions,
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
    final bg = color ?? CopaColors.branco;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: CopaColors.bordaCard),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(padding: const EdgeInsets.all(16), child: child),
        ),
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
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: destaque ? CopaColors.primary : CopaColors.branco,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: destaque ? null : Border.all(color: CopaColors.bordaCard),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      titulo,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: destaque ? CopaColors.branco : CopaColors.textoEscuro,
                      ),
                    ),
                  ),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 22,
                    color: destaque ? CopaColors.branco : CopaColors.textoSuave,
                  ),
                ],
              ),
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
          Text(emoji, style: const TextStyle(fontSize: 32)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titulo,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                    color: CopaColors.branco,
                  ),
                ),
                Text(
                  subtitulo,
                  style: TextStyle(
                    color: CopaColors.branco.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w400,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded, color: CopaColors.branco.withValues(alpha: 0.9), size: 20),
        ],
      ),
    );
  }
}
