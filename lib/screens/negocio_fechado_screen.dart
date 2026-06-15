import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../services/iap_service.dart';
import '../models/models.dart';
import '../services/mutual_match_service.dart';
import '../theme/copa_theme.dart';
import '../utils/sticker_token_util.dart';
import '../widgets/copa_widgets.dart';
import 'mutual_payment_screen.dart';

class NegocioFechadoScreen extends StatelessWidget {
  const NegocioFechadoScreen({super.key, required this.mutualMatchId});

  final String mutualMatchId;

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser!.uid;

    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: const Text(
                'Negócio Fechado',
                style: TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900),
              ),
            ),
            Expanded(
              child: StreamBuilder<List<MutualMatch>>(
                stream: MutualMatchService.instance.meusMatchesMutuos(),
                builder: (context, snap) {
                  if (!snap.hasData) {
                    return const Center(child: CircularProgressIndicator(color: CopaColors.amarelo));
                  }
                  final match = snap.data!.where((m) => m.id == mutualMatchId).firstOrNull;
                  if (match == null) {
                    return const Center(child: Text('Match não encontrado', style: TextStyle(color: CopaColors.branco)));
                  }

                  final dou = match.meuDou(uid);
                  final recebo = match.meuRecebo(uid);
                  final paguei = match.euPaguei(uid);
                  final outroPagou = match.outroPagou(uid);

                  return ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      CopaCard(
                        color: CopaColors.verde,
                        child: Column(
                          children: [
                            const Icon(Icons.handshake, color: CopaColors.branco, size: 56),
                            const SizedBox(height: 12),
                            const Text(
                              'NEGÓCIO FECHADO',
                              style: TextStyle(
                                color: CopaColors.branco,
                                fontWeight: FontWeight.w900,
                                fontSize: 22,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Match confirmado com ${match.otherUserName(uid)}',
                              style: TextStyle(color: CopaColors.branco.withValues(alpha: 0.95)),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      CopaCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${match.distanceKm.toStringAsFixed(1)} km de distância',
                                style: const TextStyle(fontWeight: FontWeight.w900)),
                            const SizedBox(height: 8),
                            Text('Figurinhas compatíveis: ${dou.length + recebo.length}'),
                            const Divider(height: 24),
                            _linha('Você DÁ', dou),
                            _linha('Você RECEBE', recebo),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      CopaCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Pagamento', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                            const SizedBox(height: 8),
                            Text(
                              'Compra in-app ${IapService.instance.precoExibicao} · libera contato e chat',
                              style: TextStyle(color: Colors.grey.shade700),
                            ),
                            const SizedBox(height: 8),
                            Text('Você: ${paguei ? "✓ Pago" : "Pendente"}'),
                            Text('${match.otherUserName(uid)}: ${outroPagou ? "✓ Pago" : "Pendente"}'),
                            const SizedBox(height: 8),
                            const Text(
                              'Contato e chat liberam somente quando AMBOS pagarem.',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                            if (!paguei) ...[
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => MutualPaymentScreen(mutualMatchId: match.id),
                                    ),
                                  ),
                                  child: Text('LIBERAR CONTATO · ${IapService.instance.precoExibicao}'),
                                ),
                              ),
                            ],
                            if (match.ambosPagaram) ...[
                              const SizedBox(height: 12),
                              const Text(
                                'Ambos pagaram! Abra o Chat na home.',
                                style: TextStyle(color: CopaColors.verde, fontWeight: FontWeight.w800),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _linha(String label, List<String> ids) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        '$label: ${ids.map(StickerTokenUtil.rotulo).join(", ")}',
        style: const TextStyle(fontSize: 13),
      ),
    );
  }
}

extension<T> on Iterable<T> {
  T? get firstOrNull {
    final it = iterator;
    if (it.moveNext()) return it.current;
    return null;
  }
}
