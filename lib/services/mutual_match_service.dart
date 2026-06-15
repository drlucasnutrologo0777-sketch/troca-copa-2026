import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../constants/pix_config.dart';
import '../models/models.dart';
import 'offer_match_service.dart';

/// Dados de uma compra IAP confirmada pela loja (Apple / Google).
class IapPurchaseInfo {
  const IapPurchaseInfo({
    required this.productId,
    required this.transactionId,
    required this.platform,
    required this.purchaseToken,
    required this.valor,
  });

  final String productId;
  final String transactionId;
  final String platform;
  final String purchaseToken;
  final double valor;
}

/// Aceite mútuo estilo Tinder — decisões, match confirmado, pagamento duplo.
class MutualMatchService {
  MutualMatchService._();
  static final instance = MutualMatchService._();

  final _db = FirebaseFirestore.instance;

  static String mutualMatchId(String a, String b) {
    final ids = [a, b]..sort();
    return '${ids[0]}_${ids[1]}';
  }

  Future<List<MatchPreview>> buscarCandidatos({
    required TradeOffer minhaOferta,
    required double raioKm,
    SearchMode mode = SearchMode.anyMissing,
    String? stickerAlvo,
  }) async {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    final todos = await MatchService.instance.buscarMatches(
      minhaOferta: minhaOferta,
      raioKm: raioKm,
      mode: mode,
      stickerAlvo: stickerAlvo,
    );

    final decididos = await _usuariosDecididos(uid);
    final emMatch = await _usuariosEmMatchAtivo(uid);

    return todos
        .where((m) => !decididos.contains(m.otherUserId) && !emMatch.contains(m.otherUserId))
        .toList();
  }

  Future<Set<String>> _usuariosDecididos(String uid) async {
    final snap = await _db.collection('matchDecisions').where('fromUserId', isEqualTo: uid).get();
    return snap.docs.map((d) => d.data()['toUserId'] as String? ?? '').where((s) => s.isNotEmpty).toSet();
  }

  Future<Set<String>> _usuariosEmMatchAtivo(String uid) async {
    final out = <String>{};
    final a = await _db.collection('mutualMatches').where('userA', isEqualTo: uid).get();
    final b = await _db.collection('mutualMatches').where('userB', isEqualTo: uid).get();
    for (final doc in [...a.docs, ...b.docs]) {
      final st = doc.data()['status'] as String? ?? '';
      if (st == 'completed') continue;
      final data = doc.data();
      final other = data['userA'] == uid ? data['userB'] : data['userA'];
      out.add(other as String? ?? '');
    }
    return out;
  }

  Future<MutualMatch?> registrarDecisao(MatchPreview candidato, {required bool aceitar}) async {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    await _db.collection('matchDecisions').doc('${uid}_${candidato.otherUserId}').set({
      'fromUserId': uid,
      'toUserId': candidato.otherUserId,
      'decision': aceitar ? 'accept' : 'reject',
      'euDou': candidato.euDou,
      'euRecebo': candidato.euRecebo,
      'distanceKm': candidato.distanceKm,
      'otherUserName': candidato.otherUserName,
      'createdAt': FieldValue.serverTimestamp(),
    });

    if (!aceitar) return null;

    final reverso = await _db.collection('matchDecisions').doc('${candidato.otherUserId}_$uid').get();
    if (reverso.data()?['decision'] != 'accept') return null;

    return _criarMatchMutuo(uid, candidato.otherUserId);
  }

  Future<MutualMatch?> _criarMatchMutuo(String uidA, String uidB) async {
    final id = mutualMatchId(uidA, uidB);
    final ref = _db.collection('mutualMatches').doc(id);
    final existente = await ref.get();
    if (existente.exists) {
      return MutualMatch.fromFirestore(id, existente.data()!);
    }

    final ofertaA = await _carregarOferta(uidA);
    final ofertaB = await _carregarOferta(uidB);
    if (ofertaA == null || ofertaB == null) return null;

    final cruzA = MatchService.instance.cruzamentoEntreOfertas(ofertaA, ofertaB);
    final cruzB = MatchService.instance.cruzamentoEntreOfertas(ofertaB, ofertaA);
    if (cruzA == null || cruzB == null) return null;

    final userA = uidA.compareTo(uidB) <= 0 ? uidA : uidB;
    final userB = uidA.compareTo(uidB) <= 0 ? uidB : uidA;
    final snapA = await _db.collection('users').doc(userA).get();
    final snapB = await _db.collection('users').doc(userB).get();

    final dist = distanciaKm(
      ofertaA.latitude,
      ofertaA.longitude,
      ofertaB.latitude,
      ofertaB.longitude,
    );

    final douA = userA == uidA ? cruzA.euDou : cruzB.euDou;
    final receboA = userA == uidA ? cruzA.euRecebo : cruzB.euRecebo;
    final douB = userB == uidB ? cruzB.euDou : cruzA.euDou;
    final receboB = userB == uidB ? cruzB.euRecebo : cruzA.euRecebo;

    final data = {
      'userA': userA,
      'userB': userB,
      'userAName': snapA.data()?['nome'] ?? 'Colecionador',
      'userBName': snapB.data()?['nome'] ?? 'Colecionador',
      'distanceKm': dist,
      'userA_dou': douA,
      'userA_recebo': receboA,
      'userB_dou': douB,
      'userB_recebo': receboB,
      'paidUserA': false,
      'paidUserB': false,
      'concluidoUserA': false,
      'concluidoUserB': false,
      'status': 'confirmed',
      'confirmedAt': FieldValue.serverTimestamp(),
    };

    await ref.set(data);
    return MutualMatch.fromFirestore(id, data);
  }

  Future<TradeOffer?> _carregarOferta(String uid) async {
    final snap = await _db.collection('offers').doc(uid).get();
    if (!snap.exists) return null;
    return TradeOffer.fromFirestore(snap.id, snap.data()!);
  }

  Stream<List<MutualMatch>> meusMatchesMutuos() {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    return _db.collection('mutualMatches').snapshots().map((s) {
      return s.docs
          .map((d) => MutualMatch.fromFirestore(d.id, d.data()))
          .where((m) => m.envolve(uid))
          .toList();
    });
  }

  Stream<List<Map<String, dynamic>>> aceitesRecebidos() {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    return _db
        .collection('matchDecisions')
        .where('toUserId', isEqualTo: uid)
        .where('decision', isEqualTo: 'accept')
        .snapshots()
        .map((s) => s.docs.map((d) => d.data()).toList());
  }

  Future<MutualMatch?> carregar(String id) async {
    final snap = await _db.collection('mutualMatches').doc(id).get();
    if (!snap.exists) return null;
    return MutualMatch.fromFirestore(snap.id, snap.data()!);
  }

  Future<void> confirmarPagamento(String mutualMatchId) async {
    await _registrarPagamento(
      mutualMatchId,
      valor: PixConfig.valorMatch,
      status: 'confirmado_manual',
      metodo: 'pix',
      extras: {
        'pixChave': PixConfig.chave,
        'pixTitular': PixConfig.titular,
        'descricao': PixConfig.descricao,
      },
    );
  }

  Future<void> confirmarPagamentoIap(String mutualMatchId, IapPurchaseInfo compra) async {
    await _registrarPagamento(
      mutualMatchId,
      valor: compra.valor,
      status: 'confirmado_iap',
      metodo: 'iap',
      extras: {
        'productId': compra.productId,
        'transactionId': compra.transactionId,
        'platform': compra.platform,
        'purchaseToken': compra.purchaseToken,
        'descricao': 'IAP match unlock',
      },
    );
  }

  Future<void> _registrarPagamento(
    String mutualMatchId, {
    required double valor,
    required String status,
    required String metodo,
    required Map<String, dynamic> extras,
  }) async {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    final match = await carregar(mutualMatchId);
    if (match == null || match.euPaguei(uid)) return;

    final batch = _db.batch();
    final ref = _db.collection('mutualMatches').doc(mutualMatchId);

    batch.update(ref, {
      if (match.userA == uid) 'paidUserA': true,
      if (match.userB == uid) 'paidUserB': true,
    });

    batch.set(_db.collection('payments').doc('${uid}_$mutualMatchId'), {
      'userId': uid,
      'mutualMatchId': mutualMatchId,
      'valor': valor,
      'metodo': metodo,
      'status': status,
      'paidAt': FieldValue.serverTimestamp(),
      ...extras,
    });

    batch.set(
      _db.collection('platform').doc('faturamento'),
      {
        'totalRecebido': FieldValue.increment(valor),
        'totalTransacoes': FieldValue.increment(1),
        'ultimaTransacaoEm': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );

    await batch.commit();

    final pagoA = match.userA == uid ? true : match.paidUserA;
    final pagoB = match.userB == uid ? true : match.paidUserB;
    if (pagoA && pagoB) {
      final atualizado = await carregar(mutualMatchId);
      if (atualizado != null) await _liberarChat(atualizado);
    }
  }

  Future<void> _liberarChat(MutualMatch match) async {
    final snapA = await _db.collection('users').doc(match.userA).get();
    final snapB = await _db.collection('users').doc(match.userB).get();
    final a = snapA.data() ?? {};
    final b = snapB.data() ?? {};

    await _db.collection('mutualMatches').doc(match.id).update({'status': 'both_paid'});

    await _db.collection('chats').doc(match.id).set({
      'participants': [match.userA, match.userB],
      'mutualMatchId': match.id,
      'user_${match.userA}_name': a['nome'] ?? '',
      'user_${match.userA}_tel': a['telefone'] ?? '',
      'user_${match.userB}_name': b['nome'] ?? '',
      'user_${match.userB}_tel': b['telefone'] ?? '',
      'unlockedAt': FieldValue.serverTimestamp(),
      'contactsUnlocked': true,
    });

    for (final uid in [match.userA, match.userB]) {
      final outro = match.otherUserId(uid);
      final outroNome = match.otherUserName(uid);
      await _db.collection('users').doc(uid).collection('unlockedMatches').doc(match.id).set({
        'mutualMatchId': match.id,
        'otherUserId': outro,
        'otherUserName': outroNome,
        'euDou': match.meuDou(uid),
        'euRecebo': match.meuRecebo(uid),
        'valorPix': PixConfig.valorMatch,
        'unlockedAt': FieldValue.serverTimestamp(),
      });
    }
  }

  Future<void> enviarMensagem(String mutualMatchId, String texto) async {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    await _db.collection('chats').doc(mutualMatchId).collection('messages').add({
      'senderId': uid,
      'text': texto.trim(),
      'type': 'text',
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> enviarLocalizacao(String mutualMatchId, double lat, double lng) async {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    await _db.collection('chats').doc(mutualMatchId).collection('messages').add({
      'senderId': uid,
      'text': 'Localização compartilhada',
      'type': 'location',
      'latitude': lat,
      'longitude': lng,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  Stream<List<ChatMessage>> mensagens(String mutualMatchId) {
    return _db
        .collection('chats')
        .doc(mutualMatchId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((s) => s.docs.map((d) => ChatMessage.fromFirestore(d.id, d.data())).toList());
  }

  Future<void> confirmarTrocaConcluida(String mutualMatchId) async {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    final match = await carregar(mutualMatchId);
    if (match == null || !match.ambosPagaram) return;

    final ref = _db.collection('mutualMatches').doc(mutualMatchId);
    await ref.update({
      if (match.userA == uid) 'concluidoUserA': true,
      if (match.userB == uid) 'concluidoUserB': true,
    });

    final atualizado = await carregar(mutualMatchId);
    if (atualizado == null) return;
    if (!atualizado.concluidoUserA || !atualizado.concluidoUserB) return;

    await ref.update({'status': 'completed', 'completedAt': FieldValue.serverTimestamp()});
    await _atualizarOfertasPosTroca(atualizado);
  }

  Future<void> _atualizarOfertasPosTroca(MutualMatch match) async {
    for (final uid in [match.userA, match.userB]) {
      final dou = match.meuDou(uid);
      final recebo = match.meuRecebo(uid);
      final ref = _db.collection('offers').doc(uid);
      final snap = await ref.get();
      if (!snap.exists) continue;
      final stickerIds = List<String>.from(snap.data()?['stickerIds'] ?? []);
      final wanted = List<String>.from(snap.data()?['wantedStickerIds'] ?? []);
      stickerIds.removeWhere(dou.contains);
      for (final r in recebo) {
        if (!stickerIds.contains(r) && stickerIds.length < TradeOffer.maxStickers) {
          stickerIds.add(r);
        }
      }
      wanted.removeWhere(recebo.contains);
      await ref.update({
        'stickerIds': stickerIds,
        'wantedStickerIds': wanted,
        'isActive': true,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }
  }

  Stream<List<ActiveChat>> chatsLiberados() {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    return _db
        .collection('chats')
        .where('participants', arrayContains: uid)
        .snapshots()
        .map((s) => s.docs
            .where((d) => d.data()['contactsUnlocked'] == true)
            .map((d) {
              final data = d.data();
              final parts = List<String>.from(data['participants'] ?? []);
              final outroId = parts.firstWhere((p) => p != uid, orElse: () => '');
              return ActiveChat(
                matchId: d.id,
                otherUserId: outroId,
                otherUserName: data['user_${outroId}_name'] as String? ?? 'Colecionador',
                otherUserTelefone: data['user_${outroId}_tel'] as String? ?? '',
              );
            })
            .toList());
  }
}
