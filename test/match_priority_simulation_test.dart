import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:troca_copa_app/models/models.dart';
import 'package:troca_copa_app/services/sticker_catalog_service.dart';
import 'package:troca_copa_app/utils/sticker_token_util.dart';

List<MatchPreview> ordenarComoApp(List<MatchPreview> lista) {
  final copia = [...lista];
  copia.sort((a, b) {
    final p = a.prioridade.ordem.compareTo(b.prioridade.ordem);
    if (p != 0) return p;
    return a.distanceKm.compareTo(b.distanceKm);
  });
  return copia;
}

bool obedeceOrdemPrioridadeEDistancia(List<MatchPreview> lista) {
  for (var i = 1; i < lista.length; i++) {
    final a = lista[i - 1];
    final b = lista[i];
    if (a.prioridade.ordem > b.prioridade.ordem) return false;
    if (a.prioridade.ordem == b.prioridade.ordem && a.distanceKm > b.distanceKm) {
      return false;
    }
  }
  return true;
}

MatchPreview simular({
  required TradeOffer minha,
  required int idx,
  required double distanciaKm,
  required List<String> euRecebo,
}) {
  return MatchPreview(
    id: 'match_$idx',
    otherUserId: 'user_$idx',
    otherUserName: 'Colecionador $idx',
    otherUserCidade: 'Cidade $idx - MG',
    distanceKm: distanciaKm,
    euDou: const ['MEX_01'],
    euRecebo: euRecebo,
    prioridade: StickerTokenUtil.prioridadeDoMatch(minha, euRecebo),
  );
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await StickerCatalogService.instance.load();
  });

  test('Simulação 30 pessoas — ordem 1º específico, 2º seleção, 3º diferente + distância', () {
    final minhaOferta = TradeOffer(
      id: 'viewer',
      userId: 'viewer',
      stickerIds: const ['MEX_01', 'BRA_02'],
      wantedStickerIds: [
        'ARG_02',
        StickerTokenUtil.qualquerSelecao('A', 'México'),
      ],
      aceitaQualquerDiferente: true,
      isActive: true,
      latitude: -16.735,
      longitude: -43.861,
    );

    final distancias = List.generate(30, (i) => (i % 10 + 1) * 1.7 + (i ~/ 10) * 0.3);
    final rnd = Random(26);
    final matches = <MatchPreview>[];

    for (var i = 0; i < 10; i++) {
      matches.add(simular(
        minha: minhaOferta,
        idx: i,
        distanciaKm: distancias[i],
        euRecebo: const ['ARG_02'],
      ));
    }
    for (var i = 10; i < 20; i++) {
      matches.add(simular(
        minha: minhaOferta,
        idx: i,
        distanciaKm: distancias[i],
        euRecebo: const ['MEX_03'],
      ));
    }
    for (var i = 20; i < 30; i++) {
      matches.add(simular(
        minha: minhaOferta,
        idx: i,
        distanciaKm: distancias[i],
        euRecebo: const ['KOR_02'],
      ));
    }

    expect(matches.length, 30);

    for (var i = 0; i < 10; i++) {
      expect(matches[i].prioridade, MatchPrioridade.especifica, reason: 'idx $i');
    }
    for (var i = 10; i < 20; i++) {
      expect(matches[i].prioridade, MatchPrioridade.qualquerSelecao, reason: 'idx $i');
    }
    for (var i = 20; i < 30; i++) {
      expect(matches[i].prioridade, MatchPrioridade.qualquerDiferente, reason: 'idx $i');
    }

    matches.shuffle(rnd);
    final ordenados = ordenarComoApp(matches);

    expect(obedeceOrdemPrioridadeEDistancia(ordenados), isTrue);

    expect(ordenados.take(10).every((m) => m.prioridade == MatchPrioridade.especifica), isTrue);
    expect(
      ordenados.skip(10).take(10).every((m) => m.prioridade == MatchPrioridade.qualquerSelecao),
      isTrue,
    );
    expect(
      ordenados.skip(20).every((m) => m.prioridade == MatchPrioridade.qualquerDiferente),
      isTrue,
    );

    for (final prio in MatchPrioridade.values) {
      final grupo = ordenados.where((m) => m.prioridade == prio).toList();
      for (var i = 1; i < grupo.length; i++) {
        expect(
          grupo[i].distanceKm >= grupo[i - 1].distanceKm,
          isTrue,
          reason: '${prio.rotulo}: ${grupo[i - 1].distanceKm} -> ${grupo[i].distanceKm}',
        );
      }
    }
  });
}
