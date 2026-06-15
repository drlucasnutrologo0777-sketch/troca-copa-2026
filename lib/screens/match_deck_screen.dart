import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import '../services/iap_service.dart';
import '../services/mutual_match_service.dart';
import '../services/presence_service.dart';
import '../theme/copa_theme.dart';
import '../utils/sticker_token_util.dart';
import '../widgets/copa_widgets.dart';
import 'negocio_fechado_screen.dart';

/// Um colecionador por vez — aceitar ou recusar (estilo Tinder).
class MatchDeckScreen extends StatefulWidget {
  const MatchDeckScreen({super.key});

  @override
  State<MatchDeckScreen> createState() => _MatchDeckScreenState();
}

class _MatchDeckScreenState extends State<MatchDeckScreen> {
  int _indice = 0;
  bool _processando = false;

  Future<void> _decidir(bool aceitar) async {
    final app = context.read<AppState>();
    if (_indice >= app.candidatosDeck.length || _processando) return;

    setState(() => _processando = true);
    final candidato = app.candidatosDeck[_indice];
    final match = await MutualMatchService.instance.registrarDecisao(candidato, aceitar: aceitar);

    if (!mounted) return;

    if (match != null) {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('MATCH CONFIRMADO!', style: TextStyle(fontWeight: FontWeight.w900)),
          content: Text(
            'Você e ${candidato.otherUserName} aceitaram a troca.\n\n'
            'Negócio fechado — pague R\$ 0,50 para liberar contato e chat.',
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => NegocioFechadoScreen(mutualMatchId: match.id)),
                );
              },
              child: const Text('VER NEGÓCIO FECHADO'),
            ),
          ],
        ),
      );
      return;
    }

    setState(() {
      _indice++;
      _processando = false;
    });

    if (aceitar) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Você aceitou ${candidato.otherUserName}. '
            'A cobrança (${IapService.instance.precoExibicao}) só aparece quando os DOIS aceitarem.',
          ),
          backgroundColor: CopaColors.azul,
          duration: const Duration(seconds: 5),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final lista = app.candidatosDeck;

    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: const Text(
                'Match',
                style: TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900),
              ),
            ),
            if (lista.isEmpty || _indice >= lista.length)
              Expanded(
                child: Center(
                  child: CopaCard(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle_outline, size: 48, color: CopaColors.verde),
                        const SizedBox(height: 12),
                        const Text(
                          'Sem mais colecionadores no raio',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Volte mais tarde ou aumente o raio de busca.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey.shade700),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  '${lista.length - _indice} restante(s) · Pagamento só após os DOIS aceitarem',
                  style: TextStyle(color: CopaColors.branco.withValues(alpha: 0.9), fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 12),
              Expanded(child: _cardCandidato(lista[_indice])),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _processando ? null : () => _decidir(false),
                        icon: const Icon(Icons.close, color: CopaColors.vermelho),
                        label: const Text('RECUSAR', style: TextStyle(color: CopaColors.vermelho)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: CopaColors.vermelho, width: 2),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: CopaColors.verde,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        onPressed: _processando ? null : () => _decidir(true),
                        icon: const Icon(Icons.favorite),
                        label: const Text('ACEITAR'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _cardCandidato(MatchPreview m) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: CopaCard(
        color: CopaColors.roxo,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                m.otherUserName,
                style: const TextStyle(
                  color: CopaColors.branco,
                  fontWeight: FontWeight.w900,
                  fontSize: 26,
                ),
              ),
              const SizedBox(height: 4),
              PresenceService.indicadorOnline(m.otherUserOnline),
              Text(
                m.otherUserCidade,
                style: TextStyle(color: CopaColors.branco.withValues(alpha: 0.9)),
              ),
              const SizedBox(height: 8),
              Text(
                '${m.distanceKm.toStringAsFixed(1)} km de distância',
                style: const TextStyle(color: CopaColors.amarelo, fontWeight: FontWeight.w800, fontSize: 16),
              ),
              const SizedBox(height: 16),
              _bloco('Possui para troca', m.euRecebo, CopaColors.verde),
              const SizedBox(height: 12),
              _bloco('Precisa', m.euDou, CopaColors.amarelo),
              const SizedBox(height: 8),
              Text(
                m.prioridade.rotulo,
                style: TextStyle(color: CopaColors.branco.withValues(alpha: 0.85), fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _bloco(String titulo, List<String> ids, Color cor) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cor.withValues(alpha: 0.25),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titulo, style: const TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          ...ids.map(
            (id) => Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Text(
                '• ${StickerTokenUtil.rotulo(id)}',
                style: const TextStyle(color: CopaColors.branco, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
