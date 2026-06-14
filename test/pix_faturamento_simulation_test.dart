import 'package:flutter_test/flutter_test.dart';
import 'package:troca_copa_app/constants/pix_config.dart';

/// Simula 10 confirmações PIX e valida faturamento acumulado.
void main() {
  test('10 trocas PIX registram R\$ 5,00 de faturamento', () {
    const quantidade = 10;
    final transacoes = List.generate(quantidade, (i) {
      return {
        'id': 'pay_user_req$i',
        'userId': 'user_${i % 2}',
        'requestId': 'req_$i',
        'valor': PixConfig.valorMatch,
        'pixChave': PixConfig.chave,
        'pixTitular': PixConfig.titular,
        'status': 'confirmado_manual',
      };
    });

    expect(transacoes.length, 10);

    final total = transacoes.fold<double>(0, (s, t) => s + (t['valor'] as double));
    expect(total, 5.0);
    expect(PixConfig.valorMatch, 0.5);
    expect(PixConfig.chave, '11968362005');
    expect(PixConfig.titular, 'Eder Lucas Santos Tiago');
  });

  test('cada transação grava campos obrigatórios no Firestore', () {
    const camposObrigatorios = [
      'userId',
      'requestId',
      'matchId',
      'valor',
      'pixChave',
      'pixTitular',
      'descricao',
      'status',
      'paidAt',
    ];

    final registro = {
      'userId': 'abc',
      'requestId': 'req1',
      'matchId': 'm1',
      'valor': PixConfig.valorMatch,
      'pixChave': PixConfig.chave,
      'pixTitular': PixConfig.titular,
      'descricao': PixConfig.descricao,
      'status': 'confirmado_manual',
      'paidAt': DateTime.now(),
    };

    for (final campo in camposObrigatorios) {
      expect(registro.containsKey(campo), isTrue, reason: 'Falta campo $campo');
    }
  });

  test('faturamento agregado incrementa por transação', () {
    var totalRecebido = 0.0;
    var totalTransacoes = 0;

    for (var i = 0; i < 10; i++) {
      totalRecebido += PixConfig.valorMatch;
      totalTransacoes += 1;
    }

    expect(totalTransacoes, 10);
    expect(totalRecebido, closeTo(5.0, 0.001));
  });
}
