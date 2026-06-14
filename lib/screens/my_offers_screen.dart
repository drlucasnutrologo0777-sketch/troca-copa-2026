import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../theme/copa_theme.dart';
import '../utils/sticker_token_util.dart';
import '../widgets/copa_widgets.dart';
import 'trade_screen.dart';

class MyOffersScreen extends StatefulWidget {
  const MyOffersScreen({super.key});

  @override
  State<MyOffersScreen> createState() => _MyOffersScreenState();
}

class _MyOffersScreenState extends State<MyOffersScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().recarregarOferta();
    });
  }

  Future<void> _apagar() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Apagar oferta?'),
        content: const Text('Sua oferta será removida e você deixa de aparecer nos matches.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCELAR')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('APAGAR', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    final app = context.read<AppState>();
    final removido = await app.apagarMinhaOferta();
    if (mounted && removido) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Oferta apagada.')),
      );
    }
  }

  Future<void> _alterar() async {
    context.read<AppState>().limparFormularioTroca();
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const TradeScreen()),
    );
    if (mounted) {
      await context.read<AppState>().recarregarOferta();
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final p = app.profile;
    final temOferta = app.ofertaAtual.isNotEmpty;

    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: const Text(
                'Minhas Ofertas',
                style: TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900),
              ),
            ),
            Expanded(
              child: app.carregando
                  ? const Center(child: CircularProgressIndicator(color: CopaColors.amarelo))
                  : ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        if (!temOferta)
                          CopaCard(
                            child: Column(
                              children: [
                                Icon(Icons.inbox_outlined, size: 48, color: Colors.grey.shade500),
                                const SizedBox(height: 12),
                                const Text(
                                  'Nenhuma oferta ativa',
                                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Registre uma troca em TROCAR FIGURINHA.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: Colors.grey.shade700),
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton(
                                  onPressed: _alterar,
                                  child: const Text('CRIAR OFERTA'),
                                ),
                              ],
                            ),
                          )
                        else ...[
                          if (p != null)
                            CopaCard(
                              child: Row(
                                children: [
                                  const Icon(Icons.location_on, color: CopaColors.azul),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      '${p.cidade} - ${p.estado} · Raio ${p.raioTrocaKm.toInt()} km',
                                      style: const TextStyle(fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          const SizedBox(height: 12),
                          _bloco(
                            titulo: 'EU OFEREÇO',
                            cor: CopaColors.verde,
                            ids: app.ofertaAtual,
                          ),
                          const SizedBox(height: 12),
                          _bloco(
                            titulo: 'QUERO RECEBER',
                            cor: CopaColors.amarelo,
                            ids: app.aceitaQualquerDiferente
                                ? const ['Qualquer figurinha diferente das que ofereci']
                                : app.desejoAtual,
                            rotuloDireto: app.aceitaQualquerDiferente,
                          ),
                          const SizedBox(height: 24),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _apagar,
                                  icon: const Icon(Icons.delete_outline),
                                  label: const Text('APAGAR'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: CopaColors.vermelho,
                                    side: const BorderSide(color: CopaColors.vermelho),
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: _alterar,
                                  icon: const Icon(Icons.edit),
                                  label: const Text('ALTERAR'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: CopaColors.azul,
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: () => Navigator.pop(context),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: CopaColors.branco,
                                side: const BorderSide(color: CopaColors.branco),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                              child: const Text('SAIR'),
                            ),
                          ),
                        ],
                        if (!temOferta) ...[
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: () => Navigator.pop(context),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: CopaColors.branco,
                                side: const BorderSide(color: CopaColors.branco),
                              ),
                              child: const Text('SAIR'),
                            ),
                          ),
                        ],
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bloco({
    required String titulo,
    required Color cor,
    required List<String> ids,
    bool rotuloDireto = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: cor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
          ),
          child: Text(
            titulo,
            style: const TextStyle(
              color: CopaColors.branco,
              fontWeight: FontWeight.w900,
              fontSize: 16,
            ),
          ),
        ),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: CopaColors.branco.withValues(alpha: 0.97),
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(14)),
          ),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ids.map((id) {
              final label = rotuloDireto ? id : StickerTokenUtil.rotulo(id);
              return Chip(
                label: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                backgroundColor: cor.withValues(alpha: 0.2),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}
