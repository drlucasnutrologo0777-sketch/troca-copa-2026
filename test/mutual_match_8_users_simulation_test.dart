import 'package:flutter_test/flutter_test.dart';
import 'package:troca_copa_app/constants/iap_config.dart';
import 'package:troca_copa_app/services/mutual_match_service.dart';

/// Simula 8 colecionadores em 4 pares com aceite mútuo e pagamento duplo (IAP).
void main() {
  test('8 pessoas — 4 matches mutuos, 8 pagamentos, 4 chats liberados', () {
    const uids = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'];
    final pairs = <(String, String)>[
      ('u1', 'u2'),
      ('u3', 'u4'),
      ('u5', 'u6'),
      ('u7', 'u8'),
    ];

    final mutualMatches = <String, Map<String, dynamic>>{};
    final payments = <Map<String, dynamic>>[];
    final chats = <String, Map<String, dynamic>>{};
    var faturamento = 0.0;

    for (final (a, b) in pairs) {
      final id = MutualMatchService.mutualMatchId(a, b);
      mutualMatches[id] = {
        'userA': a.compareTo(b) <= 0 ? a : b,
        'userB': a.compareTo(b) <= 0 ? b : a,
        'paidUserA': false,
        'paidUserB': false,
        'status': 'confirmed',
      };
    }

    expect(mutualMatches.length, 4);

    for (final (a, b) in pairs) {
      final id = MutualMatchService.mutualMatchId(a, b);
      for (final uid in [a, b]) {
        final valorIap = IapConfig.valorMatch;
        payments.add({
          'userId': uid,
          'mutualMatchId': id,
          'valor': valorIap,
          'metodo': 'iap',
          'status': 'confirmado_iap',
          'productId': IapConfig.matchUnlockProductId,
          'platform': 'apple',
        });
        faturamento += valorIap;

        final m = mutualMatches[id]!;
        if (m['userA'] == uid) {
          m['paidUserA'] = true;
        } else {
          m['paidUserB'] = true;
        }

        if (m['paidUserA'] == true && m['paidUserB'] == true) {
          m['status'] = 'both_paid';
          chats[id] = {
            'participants': [m['userA'], m['userB']],
            'contactsUnlocked': true,
          };
        }
      }
    }

    expect(payments.length, 8);
    expect(faturamento, closeTo(7.92, 0.001));
    expect(chats.length, 4);
    expect(mutualMatches.values.every((m) => m['status'] == 'both_paid'), isTrue);

    for (final uid in uids) {
      final pagos = payments.where((p) => p['userId'] == uid).length;
      expect(pagos, 1, reason: '$uid deve ter 1 pagamento');
    }
  });

  test('pagamento IAP passa nas regras do Firestore', () {
    const valorIap = IapConfig.valorMatch;
    expect(valorIap >= 0.5 && valorIap <= 99.99, isTrue);
    expect(IapConfig.matchUnlockProductId, 'br.com.seusite.trocacopa.taxachat01');
  });
}
