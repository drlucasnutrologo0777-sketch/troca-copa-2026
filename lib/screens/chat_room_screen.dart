import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../models/models.dart';
import '../services/iap_service.dart';
import '../services/mutual_match_service.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';

class ChatRoomScreen extends StatefulWidget {
  const ChatRoomScreen({super.key, required this.mutualMatchId});

  final String mutualMatchId;

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final _texto = TextEditingController();

  @override
  void dispose() {
    _texto.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    final t = _texto.text.trim();
    if (t.isEmpty) return;
    _texto.clear();
    await MutualMatchService.instance.enviarMensagem(widget.mutualMatchId, t);
  }

  Future<void> _enviarLocal() async {
    final perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      await Geolocator.requestPermission();
    }
    final pos = await Geolocator.getCurrentPosition();
    await MutualMatchService.instance.enviarLocalizacao(
      widget.mutualMatchId,
      pos.latitude,
      pos.longitude,
    );
  }

  Future<void> _concluirTroca() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Troca concluída?'),
        content: const Text('Confirma que a troca física foi feita?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('NÃO')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('SIM')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await MutualMatchService.instance.confirmarTrocaConcluida(widget.mutualMatchId);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Confirmação registrada. Aguardando o outro colecionador.'),
          backgroundColor: CopaColors.verde,
        ),
      );
    }
  }

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
              actions: [
                IconButton(onPressed: _enviarLocal, icon: const Icon(Icons.location_on, color: CopaColors.branco)),
                IconButton(onPressed: _concluirTroca, icon: const Icon(Icons.check_circle_outline, color: CopaColors.branco)),
              ],
              title: const Text('Chat', style: TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900)),
            ),
            Expanded(
              child: StreamBuilder<List<MutualMatch>>(
                stream: MutualMatchService.instance.meusMatchesMutuos(),
                builder: (context, matchSnap) {
                  final match = matchSnap.data?.where((m) => m.id == widget.mutualMatchId).firstOrNull;
                  if (match != null && !match.ambosPagaram) {
                    return Center(
                      child: CopaCard(
                        child: Text(
                          'Chat bloqueado até os dois comprarem (${IapService.instance.precoExibicao}).',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey.shade700),
                        ),
                      ),
                    );
                  }

                  return StreamBuilder<List<ChatMessage>>(
                    stream: MutualMatchService.instance.mensagens(widget.mutualMatchId),
                    builder: (context, snap) {
                      final msgs = snap.data ?? [];
                      if (msgs.isEmpty) {
                        return Center(
                          child: Text(
                            'Combine local e horário da troca.',
                            style: TextStyle(color: CopaColors.branco.withValues(alpha: 0.9)),
                          ),
                        );
                      }
                      return ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: msgs.length,
                        itemBuilder: (_, i) {
                          final m = msgs[i];
                          final eu = m.senderId == uid;
                          return Align(
                            alignment: eu ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: eu ? CopaColors.azul : CopaColors.branco.withValues(alpha: 0.95),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                m.type == 'location'
                                    ? '📍 ${m.text}\n${m.latitude?.toStringAsFixed(5)}, ${m.longitude?.toStringAsFixed(5)}'
                                    : m.text,
                                style: TextStyle(
                                  color: eu ? CopaColors.branco : CopaColors.textoEscuro,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          );
                        },
                      );
                    },
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _texto,
                      decoration: const InputDecoration(
                        hintText: 'Mensagem...',
                        filled: true,
                        fillColor: CopaColors.branco,
                      ),
                      onSubmitted: (_) => _enviar(),
                    ),
                  ),
                  IconButton(
                    onPressed: _enviar,
                    icon: const Icon(Icons.send, color: CopaColors.verde),
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

extension<T> on Iterable<T> {
  T? get firstOrNull {
    final it = iterator;
    if (it.moveNext()) return it.current;
    return null;
  }
}
