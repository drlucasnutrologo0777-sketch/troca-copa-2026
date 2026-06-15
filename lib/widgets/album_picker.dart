import 'package:flutter/material.dart';
import '../services/sticker_catalog_service.dart';
import '../theme/copa_theme.dart';
import '../utils/sticker_token_util.dart';
import 'copa_widgets.dart';

/// Navegação álbum: Grupo → Seleção → Figurinha (sem digitar números).
class AlbumPicker extends StatefulWidget {
  const AlbumPicker({
    super.key,
    required this.onSelected,
    this.titulo = 'Escolha a figurinha',
    /// Dentro de cards brancos (Trocar Figurinha) — ícone/título escuros.
    this.fundoClaro = false,
    /// Volta ao grupo após cada toque (facilita escolher de vários grupos).
    this.resetarAposSelecao = false,
  });

  final ValueChanged<String> onSelected;
  final String titulo;
  final bool fundoClaro;
  final bool resetarAposSelecao;

  @override
  State<AlbumPicker> createState() => _AlbumPickerState();
}

class _AlbumPickerState extends State<AlbumPicker> {
  String? _grupo;
  String? _selecao;

  Color get _corIcone => widget.fundoClaro ? CopaColors.azul : CopaColors.branco;
  Color get _corTitulo => widget.fundoClaro ? CopaColors.textoEscuro : CopaColors.branco;

  void _selecionar(String id) {
    widget.onSelected(id);
    if (widget.resetarAposSelecao) {
      setState(() {
        _grupo = null;
        _selecao = null;
      });
    }
  }

  void _voltarGrupo() => setState(() {
        _grupo = null;
        _selecao = null;
      });

  void _voltarSelecao() => setState(() => _selecao = null);

  @override
  Widget build(BuildContext context) {
    final catalog = StickerCatalogService.instance;
    if (_grupo == null) {
      return _lista(
        titulo: 'Grupo',
        itens: catalog.grupos
            .map((g) => _Item(g.nome, CopaColors.circulos[g.id.codeUnitAt(0) % 6]))
            .toList(),
        onTap: (i) => setState(() => _grupo = catalog.grupos[i].id),
      );
    }
    if (_selecao == null) {
      final g = catalog.grupos.firstWhere((x) => x.id == _grupo);
      return _lista(
        titulo: g.nome,
        voltar: () => setState(() => _grupo = null),
        itens: g.selecoes.map((s) => _Item(s.nome, CopaColors.verde)).toList(),
        onTap: (i) => setState(() => _selecao = g.selecoes[i].nome),
      );
    }
    final stickers = catalog.porSelecao(_grupo!, _selecao!);
    final anyId = StickerTokenUtil.qualquerSelecao(_grupo!, _selecao!);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            IconButton(
              onPressed: _voltarSelecao,
              icon: Icon(Icons.arrow_back, color: _corIcone),
              tooltip: 'Voltar seleções',
            ),
            Expanded(
              child: Text(
                '$_selecao · Jogadores',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: _corTitulo,
                      fontWeight: FontWeight.w900,
                    ),
              ),
            ),
            TextButton(
              onPressed: _voltarGrupo,
              child: Text(
                'GRUPOS',
                style: TextStyle(
                  color: _corIcone,
                  fontWeight: FontWeight.w900,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: CopaCard(
            color: CopaColors.amarelo,
            onTap: () => _selecionar(anyId),
            child: Row(
              children: [
                const Icon(Icons.groups, color: CopaColors.textoEscuro, size: 36),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'QUALQUER JOGADOR DESTA SELEÇÃO',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                          color: CopaColors.textoEscuro,
                        ),
                      ),
                      Text(
                        _selecao!,
                        style: TextStyle(
                          color: CopaColors.textoEscuro.withValues(alpha: 0.85),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.add_circle, color: CopaColors.verde, size: 32),
              ],
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: stickers.length,
            itemBuilder: (_, i) {
              final s = stickers[i];
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: CopaCard(
                  onTap: () => _selecionar(s.idUnico),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 56,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [CopaColors.amarelo, CopaColors.vermelho],
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          s.idUnico.split('_').last,
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            color: CopaColors.branco,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Grupo ${s.grupo} · ${s.selecao}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Colors.grey.shade600,
                              ),
                            ),
                            Text(
                              'Nº ${s.numeroExibicao}',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                            ),
                            Text(
                              s.nomeJogador,
                              style: TextStyle(color: Colors.grey.shade800),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.add_circle, color: CopaColors.verde),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _lista({
    required String titulo,
    required List<_Item> itens,
    required ValueChanged<int> onTap,
    VoidCallback? voltar,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            if (voltar != null)
              IconButton(
                onPressed: voltar,
                icon: Icon(Icons.arrow_back, color: _corIcone),
                tooltip: 'Voltar',
              ),
            Expanded(
              child: Text(
                titulo,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: _corTitulo,
                      fontWeight: FontWeight.w900,
                    ),
              ),
            ),
          ],
        ),
        Expanded(
          child: ListView.builder(
            itemCount: itens.length,
            itemBuilder: (_, i) {
              final item = itens[i];
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: CopaCard(
                  color: item.cor,
                  onTap: () => onTap(i),
                  child: Text(
                    item.label,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 17,
                      color: CopaColors.branco,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Item {
  _Item(this.label, this.cor);
  final String label;
  final Color cor;
}
