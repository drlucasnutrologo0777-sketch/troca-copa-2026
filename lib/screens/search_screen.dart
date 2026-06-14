import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import '../theme/copa_theme.dart';
import '../utils/sticker_token_util.dart';
import '../widgets/album_picker.dart';
import '../widgets/copa_widgets.dart';
import 'match_deck_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  double _raio = 10;
  SearchMode _modo = SearchMode.anyMissing;
  String? _stickerAlvo;

  static const _distancias = [1.0, 5.0, 10.0, 30.0, 50.0];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: const Text(
                'Buscar Trocas',
                style: TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  CopaCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Distância', style: TextStyle(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: _distancias.map((d) {
                            final sel = _raio == d;
                            return ChoiceChip(
                              label: Text('${d.toInt()} km'),
                              selected: sel,
                              selectedColor: CopaColors.amarelo,
                              onSelected: (_) => setState(() => _raio = d),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  CopaCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Modo de busca', style: TextStyle(fontWeight: FontWeight.w900)),
                        RadioListTile<SearchMode>(
                          title: const Text('Figurinha específica'),
                          value: SearchMode.specific,
                          groupValue: _modo,
                          onChanged: (v) => setState(() {
                            _modo = v!;
                            _stickerAlvo = null;
                          }),
                        ),
                        RadioListTile<SearchMode>(
                          title: const Text('Qualquer da seleção'),
                          value: SearchMode.selection,
                          groupValue: _modo,
                          onChanged: (v) => setState(() {
                            _modo = v!;
                            _stickerAlvo = null;
                          }),
                        ),
                        RadioListTile<SearchMode>(
                          title: const Text('Qualquer que ainda não possuo'),
                          value: SearchMode.anyMissing,
                          groupValue: _modo,
                          onChanged: (v) => setState(() {
                            _modo = v!;
                            _stickerAlvo = null;
                          }),
                        ),
                      ],
                    ),
                  ),
                  if (_modo != SearchMode.anyMissing) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 320,
                      child: AlbumPicker(
                        titulo: 'O que você procura?',
                        onSelected: (id) => setState(() => _stickerAlvo = id),
                      ),
                    ),
                    if (_stickerAlvo != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Selecionado: ${StickerTokenUtil.rotulo(_stickerAlvo!)}',
                          style: const TextStyle(color: CopaColors.amarelo, fontWeight: FontWeight.w800),
                        ),
                      ),
                  ],
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () async {
                      await context.read<AppState>().buscarCandidatos(
                            raioKm: _raio,
                            mode: _modo,
                            stickerAlvo: _stickerAlvo,
                          );
                      if (context.mounted) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const MatchDeckScreen()),
                        );
                      }
                    },
                    child: const Text('INICIAR MATCH'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
