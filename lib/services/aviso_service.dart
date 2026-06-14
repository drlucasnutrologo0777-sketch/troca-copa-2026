import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../constants/pix_config.dart';
import '../models/models.dart';
import '../screens/chat_room_screen.dart';
import '../screens/match_deck_screen.dart';
import '../screens/mutual_payment_screen.dart';
import '../screens/negocio_fechado_screen.dart';
import '../theme/copa_theme.dart';

/// Avisos em tempo real: aceite mútuo, match confirmado e pagamento.
class AvisoService {
  AvisoService._();
  static final instance = AvisoService._();

  bool _inicializado = false;
  final Set<String> _matchesVistos = {};
  final Map<String, MutualMatchStatus> _statusAnterior = {};

  void reset() {
    _inicializado = false;
    _matchesVistos.clear();
    _statusAnterior.clear();
  }

  void processarMatchesMutuos(BuildContext context, List<MutualMatch> lista) {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    if (!_inicializado) {
      for (final m in lista) {
        _matchesVistos.add(m.id);
        _statusAnterior[m.id] = m.status;
      }
      _inicializado = true;
      return;
    }

    for (final m in lista) {
      if (!_matchesVistos.contains(m.id)) {
        _matchesVistos.add(m.id);
        _dialogo(
          context,
          titulo: 'MATCH CONFIRMADO!',
          mensagem:
              'Você e ${m.otherUserName(uid)} aceitaram a troca.\n\n'
              'Negócio fechado — pague R\$ ${PixConfig.valorMatch.toStringAsFixed(2)} para liberar contato.',
          acao: 'VER NEGÓCIO FECHADO',
          onAcao: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => NegocioFechadoScreen(mutualMatchId: m.id)),
          ),
        );
      }

      final anterior = _statusAnterior[m.id];
      if (anterior != m.status) {
        if (m.status == MutualMatchStatus.bothPaid) {
          _dialogo(
            context,
            titulo: 'Contato liberado!',
            mensagem: 'Ambos pagaram. Nome, telefone e chat estão disponíveis.',
            acao: 'ABRIR CHAT',
            onAcao: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => ChatRoomScreen(mutualMatchId: m.id)),
            ),
          );
        } else if (m.status == MutualMatchStatus.completed) {
          _dialogo(
            context,
            titulo: 'Troca concluída',
            mensagem: 'A negociação foi encerrada e o álbum foi atualizado.',
            acao: 'ENTENDI',
          );
        }
      }

      if (m.aguardandoPagamento && !m.euPaguei(uid) && m.outroPagou(uid)) {
        final chave = '${m.id}_pay_reminder';
        if (!_matchesVistos.contains(chave)) {
          _matchesVistos.add(chave);
          _dialogo(
            context,
            titulo: 'Outro colecionador pagou',
            mensagem:
                '${m.otherUserName(uid)} já pagou o PIX.\n'
                'Pague R\$ ${PixConfig.valorMatch.toStringAsFixed(2)} para liberar o chat.',
            acao: 'PAGAR PIX',
            onAcao: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => MutualPaymentScreen(mutualMatchId: m.id)),
            ),
          );
        }
      }

      _statusAnterior[m.id] = m.status;
    }
  }

  void processarAceitesRecebidos(BuildContext context, List<Map<String, dynamic>> aceites) {
    for (final a in aceites) {
      final id = a['fromUserId'] as String? ?? '';
      if (id.isEmpty) continue;
      final chave = 'aceite_$id';
      if (_matchesVistos.contains(chave)) continue;
      _matchesVistos.add(chave);
      final nome = a['otherUserName'] as String? ?? 'Um colecionador';
      _dialogo(
        context,
        titulo: 'Alguém aceitou você!',
        mensagem: '$nome aceitou sua troca. Abra Match e aceite de volta para confirmar.',
        acao: 'VER MATCH',
        onAcao: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const MatchDeckScreen()),
        ),
      );
    }
  }

  Future<void> _dialogo(
    BuildContext context, {
    required String titulo,
    required String mensagem,
    required String acao,
    VoidCallback? onAcao,
  }) async {
    if (!context.mounted) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(titulo, style: const TextStyle(fontWeight: FontWeight.w900)),
        content: Text(mensagem),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('FECHAR')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: CopaColors.verde),
            onPressed: () {
              Navigator.pop(ctx);
              onAcao?.call();
            },
            child: Text(acao),
          ),
        ],
      ),
    );
  }
}
