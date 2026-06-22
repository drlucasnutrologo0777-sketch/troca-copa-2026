import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import '../theme/copa_theme.dart';
import '../utils/sticker_token_util.dart';
import '../widgets/album_picker.dart';
import '../widgets/copa_widgets.dart';
import 'match_deck_screen.dart';

class MatchScreen extends StatefulWidget {
  const MatchScreen({super.key});

  @override
  State<MatchScreen> createState() => _MatchScreenState();
}

class _MatchScreenState extends State<MatchScreen> {
  late final TextEditingController _cidade;
  late final TextEditingController _estado;
  double _raio = 10;
  SearchMode _modo = SearchMode.anyMissing;
  String? _stickerAlvo;

  static const _distancias = [1.0, 5.0, 10.0, 30.0, 50.0];

  @override
  void initState() {
    super.initState();
    final p = context.read<AppState>().profile;
    _cidade = TextEditingController(text: p?.cidade ?? '');
    _estado = TextEditingController(text: p?.estado ?? 'MG');
    _raio = p?.raioTrocaKm ?? 10;
  }

  @override
  void dispose() {
    _cidade.dispose();
    _estado.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();

    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              title: const Text('Match'),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  CopaCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Aceite mútuo — estilo Tinder',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Um colecionador por vez. A compra in-app só aparece após os dois aceitarem.',
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _cidade,
                          decoration: const InputDecoration(
                            labelText: 'Cidade',
                            prefixIcon: Icon(Icons.location_city, color: CopaColors.azul),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _estado,
                          decoration: const InputDecoration(
                            labelText: 'Estado (UF)',
                            prefixIcon: Icon(Icons.map, color: CopaColors.azul),
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text('Raio de busca', style: TextStyle(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _distancias.map((d) {
                            final sel = _raio == d;
                            return ChoiceChip(
                              label: Text('${d.toInt()} km'),
                              selected: sel,
                              selectedColor: CopaColors.primary.withValues(alpha: 0.35),
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
                        const Text('Tipo de busca', style: TextStyle(fontWeight: FontWeight.w900)),
                        RadioListTile<SearchMode>(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Figurinha específica'),
                          value: SearchMode.specific,
                          groupValue: _modo,
                          onChanged: (v) => setState(() {
                            _modo = v!;
                            _stickerAlvo = null;
                          }),
                        ),
                        RadioListTile<SearchMode>(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Qualquer jogador de um país'),
                          value: SearchMode.selection,
                          groupValue: _modo,
                          onChanged: (v) => setState(() {
                            _modo = v!;
                            _stickerAlvo = null;
                          }),
                        ),
                        RadioListTile<SearchMode>(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Qualquer figurinha que ainda não possuo'),
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
                        titulo: _modo == SearchMode.selection
                            ? 'Qual país você quer?'
                            : 'Qual figurinha você quer?',
                        onSelected: (id) => setState(() => _stickerAlvo = id),
                      ),
                    ),
                    if (_stickerAlvo != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Selecionado: ${StickerTokenUtil.rotulo(_stickerAlvo!)}',
                          style: const TextStyle(color: CopaColors.primary, fontWeight: FontWeight.w600),
                        ),
                      ),
                  ],
                  const SizedBox(height: 20),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: CopaColors.primary),
                    onPressed: app.carregando ? null : () => _buscar(context),
                    child: app.carregando
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('BUSCAR COLECIONADORES'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _buscar(BuildContext context) async {
    if (_modo != SearchMode.anyMissing && (_stickerAlvo == null || _stickerAlvo!.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione a figurinha ou país desejado.')),
      );
      return;
    }

    final app = context.read<AppState>();
    if (!app.online) {
      final ficar = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Ficar online?'),
          content: const Text(
            'Para buscar colecionadores, fique ONLINE e ative a localização.',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCELAR')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('FICAR ONLINE')),
          ],
        ),
      );
      if (ficar != true) return;
      final ok = await app.ficarOnline();
      if (!ok) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(app.erro ?? 'Ative a localização.')),
          );
        }
        return;
      }
    }

    await app.atualizarLocalBusca(
      cidade: _cidade.text,
      estado: _estado.text,
      raioKm: _raio,
    );
    await app.buscarCandidatos(
      raioKm: _raio,
      mode: _modo,
      stickerAlvo: _stickerAlvo,
    );

    if (!context.mounted) return;
    if (app.candidatosDeck.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nenhum colecionador compatível no raio escolhido.')),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const MatchDeckScreen()),
    );
  }
}
