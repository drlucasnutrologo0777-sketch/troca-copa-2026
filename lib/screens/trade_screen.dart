import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import '../theme/copa_theme.dart';
import '../utils/sticker_token_util.dart';
import '../widgets/album_picker.dart';
import '../widgets/copa_widgets.dart';

class TradeScreen extends StatefulWidget {
  const TradeScreen({super.key});

  @override
  State<TradeScreen> createState() => _TradeScreenState();
}

class _TradeScreenState extends State<TradeScreen> {
  late final TextEditingController _cidade;
  late final TextEditingController _estado;
  double _raio = 10;

  static const _distancias = [1.0, 5.0, 10.0, 25.0, 50.0, 100.0];

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
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: const Text(
                'Trocar Figurinha',
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
                        const Text('Local da troca', style: TextStyle(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 12),
                        TextField(controller: _cidade, decoration: const InputDecoration(labelText: 'Cidade')),
                        const SizedBox(height: 8),
                        TextField(controller: _estado, decoration: const InputDecoration(labelText: 'Estado (UF)')),
                        const SizedBox(height: 12),
                        const Text('Raio de troca', style: TextStyle(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: _distancias.map((d) {
                            return ChoiceChip(
                              label: Text('${d.toInt()} km'),
                              selected: _raio == d,
                              selectedColor: CopaColors.amarelo,
                              onSelected: (_) => setState(() => _raio = d),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _secaoDestaque(
                    titulo: 'EU OFEREÇO',
                    subtitulo: 'Figurinhas repetidas que você tem',
                    contador: '${app.ofertaAtual.length}/${TradeOffer.maxStickers}',
                    cor: CopaColors.verde,
                    icone: Icons.upload,
                    child: SizedBox(
                      height: 280,
                      child: _picker(
                        app.ofertaAtual,
                        'Toque para escolher o que você OFERECE',
                        app.adicionarFigurinha,
                        app.removerFigurinha,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _secaoDestaque(
                    titulo: 'QUERO RECEBER',
                    subtitulo: app.aceitaQualquerDiferente
                        ? 'Qualquer figurinha diferente das que você ofereceu'
                        : 'Figurinhas específicas que você quer na troca',
                    contador: app.aceitaQualquerDiferente
                        ? 'QUALQUER DIFERENTE'
                        : '${app.desejoAtual.length}/${TradeOffer.maxStickers}',
                    cor: CopaColors.amarelo,
                    icone: Icons.download,
                    child: Column(
                      children: [
                        Material(
                          color: CopaColors.branco,
                          borderRadius: BorderRadius.circular(14),
                          elevation: 2,
                          child: SwitchListTile(
                            title: const Text(
                              'Troco por qualquer figurinha diferente das que ofereci',
                              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                            ),
                            subtitle: const Text(
                              'Aceita qualquer repetida do outro, desde que não seja igual às suas ofertas',
                              style: TextStyle(fontSize: 12),
                            ),
                            value: app.aceitaQualquerDiferente,
                            activeThumbColor: CopaColors.verde,
                            onChanged: (v) => app.setAceitaQualquerDiferente(v),
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (app.aceitaQualquerDiferente)
                          CopaCard(
                            color: CopaColors.azul.withValues(alpha: 0.15),
                            child: Row(
                              children: [
                                const Icon(Icons.swap_horiz, color: CopaColors.azul),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    app.ofertaAtual.isEmpty
                                        ? 'Primeiro selecione o que você OFERECE acima.'
                                        : 'Você aceita qualquer figurinha que NÃO seja: ${app.ofertaAtual.join(", ")}',
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          )
                        else
                          SizedBox(
                            height: 280,
                            child: _picker(
                              app.desejoAtual,
                              'Toque para escolher o que você QUER RECEBER',
                              app.adicionarDesejo,
                              app.removerDesejo,
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (app.erro != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(app.erro!, style: const TextStyle(color: Colors.red)),
                    ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: CopaColors.verde,
                      ),
                      onPressed: app.carregando
                          ? null
                          : () async {
                              context.read<AppState>().limparMensagens();
                              final ok = await app.registrarTroca(
                                cidade: _cidade.text,
                                estado: _estado.text,
                                raioKm: _raio,
                              );
                              if (ok && context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Oferta de troca registrada com sucesso!',
                                      style: TextStyle(fontWeight: FontWeight.w700),
                                    ),
                                    backgroundColor: CopaColors.verde,
                                  ),
                                );
                                Navigator.pop(context);
                              }
                            },
                      child: app.carregando
                          ? const SizedBox(
                              height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('REGISTRAR TROCA', style: TextStyle(fontWeight: FontWeight.w900)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _secaoDestaque({
    required String titulo,
    required String subtitulo,
    required String contador,
    required Color cor,
    required IconData icone,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: cor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
            boxShadow: [
              BoxShadow(color: cor.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 4)),
            ],
          ),
          child: Row(
            children: [
              Icon(icone, color: CopaColors.branco, size: 32),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      titulo,
                      style: const TextStyle(
                        color: CopaColors.branco,
                        fontWeight: FontWeight.w900,
                        fontSize: 20,
                        letterSpacing: 0.5,
                      ),
                    ),
                    Text(
                      subtitulo,
                      style: TextStyle(color: CopaColors.branco.withValues(alpha: 0.95), fontSize: 12),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: CopaColors.branco.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  contador,
                  style: const TextStyle(
                    color: CopaColors.branco,
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: CopaColors.branco.withValues(alpha: 0.97),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(18)),
          ),
          child: child,
        ),
      ],
    );
  }

  Widget _picker(
    List<String> ids,
    String titulo,
    void Function(String) add,
    void Function(String) remove,
  ) {
    return Column(
      children: [
        if (ids.isNotEmpty)
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(bottom: 4),
              children: ids.map((id) {
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: Chip(
                    label: Text(StickerTokenUtil.rotulo(id), style: const TextStyle(fontSize: 11)),
                    deleteIcon: const Icon(Icons.close, size: 16),
                    onDeleted: () => remove(id),
                    backgroundColor: CopaColors.amarelo.withValues(alpha: 0.5),
                  ),
                );
              }).toList(),
            ),
          ),
        Expanded(
          child: AlbumPicker(
            titulo: titulo,
            onSelected: (id) {
              if (ids.length >= TradeOffer.maxStickers) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Limite de 7 figurinhas.')),
                );
                return;
              }
              add(id);
            },
          ),
        ),
      ],
    );
  }
}
