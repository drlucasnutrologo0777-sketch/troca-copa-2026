import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/models.dart';
import '../utils/sticker_token_util.dart';
import 'sticker_catalog_service.dart';

class OfferService {
  OfferService._();
  static final instance = OfferService._();

  final _db = FirebaseFirestore.instance;

  Future<void> publicarOferta({
    required List<String> stickerIds,
    required List<String> wantedStickerIds,
    bool aceitaQualquerDiferente = false,
  }) async {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    final user = await _db.collection('users').doc(uid).get();
    final lat = (user.data()?['latitude'] as num?)?.toDouble() ?? 0;
    final lng = (user.data()?['longitude'] as num?)?.toDouble() ?? 0;

    await _db.collection('offers').doc(uid).set({
      'userId': uid,
      'stickerIds': stickerIds.take(TradeOffer.maxStickers).toList(),
      'wantedStickerIds': wantedStickerIds.take(TradeOffer.maxStickers).toList(),
      'aceitaQualquerDiferente': aceitaQualquerDiferente,
      'isActive': true,
      'latitude': lat,
      'longitude': lng,
      'updatedAt': FieldValue.serverTimestamp(),
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  Future<List<TradeOffer>> listarOfertasAtivas({String? excetoUserId}) async {
    final snap = await _db.collection('offers').where('isActive', isEqualTo: true).get();
    return snap.docs
        .map((d) => TradeOffer.fromFirestore(d.id, d.data()))
        .where((o) => excetoUserId == null || o.userId != excetoUserId)
        .toList();
  }

  Future<TradeOffer?> minhaOferta() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return null;
    final snap = await _db.collection('offers').doc(uid).get();
    if (!snap.exists) return null;
    final offer = TradeOffer.fromFirestore(snap.id, snap.data()!);
    if (!offer.isActive) return null;
    return offer;
  }

  Future<void> apagarOferta() async {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    await _db.collection('offers').doc(uid).delete();
  }
}

class MatchService {
  MatchService._();
  static final instance = MatchService._();

  final _db = FirebaseFirestore.instance;
  static const tempoExpiracaoMatch = Duration(minutes: 10);

  Future<List<MatchPreview>> buscarMatches({
    required TradeOffer minhaOferta,
    required double raioKm,
    SearchMode mode = SearchMode.anyMissing,
    String? stickerAlvo,
  }) async {
    final outras = await OfferService.instance.listarOfertasAtivas(
      excetoUserId: minhaOferta.userId,
    );

    final resultados = <MatchPreview>[];
    for (final outra in outras) {
      final dist = distanciaKm(
        minhaOferta.latitude,
        minhaOferta.longitude,
        outra.latitude,
        outra.longitude,
      );
      if (dist > raioKm) continue;

      final cruzamento = _cruzamentoTroca(minhaOferta, outra);
      if (cruzamento == null) continue;
      if (mode == SearchMode.specific &&
          stickerAlvo != null &&
          !cruzamento.euRecebo.contains(stickerAlvo)) {
        continue;
      }
      if (mode == SearchMode.selection && stickerAlvo != null) {
        final bateSelecao = cruzamento.euRecebo.any((id) {
          if (StickerTokenUtil.isQualquerSelecao(id)) return true;
          if (id == stickerAlvo) return true;
          final s = StickerCatalogService.instance.porId(id);
          if (s == null) return false;
          return StickerTokenUtil.stickerNaSelecao(stickerAlvo, s) ||
              StickerTokenUtil.stickerNoConjunto(id, [stickerAlvo]);
        });
        if (!bateSelecao) continue;
      }

      final userSnap = await _db.collection('users').doc(outra.userId).get();
      final u = userSnap.data() ?? {};

      resultados.add(MatchPreview(
        id: '${minhaOferta.userId}_${outra.userId}',
        otherUserId: outra.userId,
        otherUserName: u['nome'] as String? ?? 'Colecionador',
        otherUserCidade: '${u['cidade'] ?? ''} - ${u['estado'] ?? ''}',
        distanceKm: dist,
        euDou: cruzamento.euDou,
        euRecebo: cruzamento.euRecebo,
        prioridade: StickerTokenUtil.prioridadeDoMatch(minhaOferta, cruzamento.euRecebo),
        otherUserOnline: u['isOnline'] as bool? ?? false,
      ));
    }

    resultados.sort((a, b) {
      final p = a.prioridade.ordem.compareTo(b.prioridade.ordem);
      if (p != 0) return p;
      return a.distanceKm.compareTo(b.distanceKm);
    });
    return resultados;
  }

  ({List<String> euDou, List<String> euRecebo})? cruzamentoEntreOfertas(
    TradeOffer minha,
    TradeOffer outra,
  ) =>
      _cruzamentoTroca(minha, outra);

  ({List<String> euDou, List<String> euRecebo})? _cruzamentoTroca(
    TradeOffer minha,
    TradeOffer outra,
  ) {
    final euDou = _figurinhasQueDou(minha, outra);
    final euRecebo = _figurinhasQueRecebo(minha, outra);
    if (euDou.isEmpty || euRecebo.isEmpty) return null;
    return (euDou: euDou, euRecebo: euRecebo);
  }

  List<String> _figurinhasQueDou(TradeOffer minha, TradeOffer outra) {
    final dou = <String>[];

    if (outra.wantedStickerIds.isNotEmpty) {
      dou.addAll(StickerTokenUtil.cruzamento(minha.stickerIds, outra.wantedStickerIds));
    }
    if (outra.aceitaQualquerDiferente) {
      for (final id in StickerTokenUtil.figurinhasDiferentesDasMinhas(minha.stickerIds, outra.stickerIds)) {
        if (!dou.contains(id)) dou.add(id);
      }
    }

    return dou;
  }

  List<String> _figurinhasQueRecebo(TradeOffer minha, TradeOffer outra) {
    final recebo = <String>[];

    if (minha.wantedStickerIds.isNotEmpty) {
      recebo.addAll(StickerTokenUtil.cruzamento(outra.stickerIds, minha.wantedStickerIds));
    }
    if (minha.aceitaQualquerDiferente) {
      for (final id in StickerTokenUtil.figurinhasDiferentesDasMinhas(outra.stickerIds, minha.stickerIds)) {
        if (!recebo.contains(id)) recebo.add(id);
      }
    }

    return recebo;
  }

  Future<({String id, bool destinoOnline})> solicitarMatch(
    MatchPreview m,
    String fromUserName,
  ) async {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    final ref = _db.collection('matchRequests').doc();
    final destinoOnline = await _usuarioOnline(m.otherUserId);
    final agora = DateTime.now();

    await ref.set({
      'fromUserId': uid,
      'toUserId': m.otherUserId,
      'fromUserName': fromUserName,
      'toUserName': m.otherUserName,
      'matchId': m.id,
      'status': 'pending',
      'euDou': m.euDou,
      'euRecebo': m.euRecebo,
      'distanceKm': m.distanceKm,
      'createdAt': FieldValue.serverTimestamp(),
      if (destinoOnline) 'expiresAt': Timestamp.fromDate(agora.add(tempoExpiracaoMatch)),
      'aguardandoDestinoOnline': !destinoOnline,
    });
    await _db.collection('offers').doc(uid).update({
      'isActive': false,
      'updatedAt': FieldValue.serverTimestamp(),
    });
    return (id: ref.id, destinoOnline: destinoOnline);
  }

  Future<bool> _usuarioOnline(String userId) async {
    if (userId.isEmpty) return false;
    final snap = await _db.collection('users').doc(userId).get();
    return snap.data()?['isOnline'] == true;
  }

  Future<void> _sincronizarExpiracaoPorPresenca(
    DocumentReference<Map<String, dynamic>> ref,
    Map<String, dynamic> data,
  ) async {
    if (data['status'] != 'pending') return;

    final toUserId = data['toUserId'] as String? ?? '';
    final online = await _usuarioOnline(toUserId);
    final expiraAtual = (data['expiresAt'] as Timestamp?)?.toDate();

    if (!online) {
      if (expiraAtual != null || data['aguardandoDestinoOnline'] != true) {
        await ref.update({
          'expiresAt': FieldValue.delete(),
          'aguardandoDestinoOnline': true,
        });
      }
      return;
    }

    if (data['aguardandoDestinoOnline'] == true || expiraAtual == null) {
      await ref.update({
        'expiresAt': Timestamp.fromDate(DateTime.now().add(tempoExpiracaoMatch)),
        'aguardandoDestinoOnline': false,
      });
    }
  }

  Future<int> contarSolicitacoesPendentesRecebidas() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return 0;
    final snap = await _db.collection('matchRequests').where('toUserId', isEqualTo: uid).get();
    return snap.docs.where((d) => d.data()['status'] == 'pending').length;
  }

  Future<void> expirarSolicitacoesVencidas() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    final agora = DateTime.now();
    final docs = <QueryDocumentSnapshot<Map<String, dynamic>>>[];
    final recebidas = await _db.collection('matchRequests').where('toUserId', isEqualTo: uid).get();
    final enviadas = await _db.collection('matchRequests').where('fromUserId', isEqualTo: uid).get();
    docs.addAll(recebidas.docs);
    for (final d in enviadas.docs) {
      if (!docs.any((x) => x.id == d.id)) docs.add(d);
    }

    for (final doc in docs) {
      final data = doc.data();
      final status = data['status'] as String?;
      // Só expira se ainda estiver aguardando resposta. Aceito/pago não expira.
      if (status != 'pending') continue;

      await _sincronizarExpiracaoPorPresenca(doc.reference, data);

      final atualizado = await doc.reference.get();
      final dados = atualizado.data() ?? data;
      if (dados['status'] != 'pending') continue;

      final toUserOnline = await _usuarioOnline(dados['toUserId'] as String? ?? '');
      if (!toUserOnline) continue;

      final expira = _dataExpiracao(dados);
      if (expira == null || agora.isBefore(expira)) continue;

      await doc.reference.update({
        'status': 'expired',
        'expiredAt': FieldValue.serverTimestamp(),
      });
      await _reativarMinhaOferta();
    }
  }

  DateTime? _dataExpiracao(Map<String, dynamic> data) {
    final expira = (data['expiresAt'] as Timestamp?)?.toDate();
    if (expira != null) return expira;
    final criado = (data['createdAt'] as Timestamp?)?.toDate();
    return criado?.add(tempoExpiracaoMatch);
  }

  Future<void> reativarMinhaOferta() => _reativarMinhaOferta();

  Future<void> _reativarMinhaOferta() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    final ref = _db.collection('offers').doc(uid);
    final snap = await ref.get();
    if (snap.exists) {
      await ref.update({'isActive': true, 'updatedAt': FieldValue.serverTimestamp()});
    }
  }

  List<MatchRequest> _mapSolicitacoes(
    QuerySnapshot<Map<String, dynamic>> snap,
  ) {
    return snap.docs
        .map((d) => MatchRequest.fromFirestore(d.id, d.data()))
        .where((r) => !r.isExpired)
        .toList();
  }

  Stream<List<MatchRequest>> solicitacoesRecebidas() {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    return _db
        .collection('matchRequests')
        .where('toUserId', isEqualTo: uid)
        .snapshots()
        .asyncMap((s) async {
          await expirarSolicitacoesVencidas();
          return _mapSolicitacoes(s);
        });
  }

  Stream<List<MatchRequest>> solicitacoesEnviadas() {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    return _db
        .collection('matchRequests')
        .where('fromUserId', isEqualTo: uid)
        .snapshots()
        .asyncMap((s) async {
          await expirarSolicitacoesVencidas();
          return _mapSolicitacoes(s);
        });
  }

  Future<void> aceitarSolicitacao(String requestId) async {
    final req = await carregarSolicitacao(requestId);
    if (req == null || req.isExpired) return;

    final destinoOnline = await _usuarioOnline(req.toUserId);
    if (destinoOnline && req.tempoRestante == Duration.zero) {
      await _db.collection('matchRequests').doc(requestId).update({
        'status': 'expired',
        'expiredAt': FieldValue.serverTimestamp(),
      });
      await _reativarMinhaOferta();
      return;
    }

    await _db.collection('matchRequests').doc(requestId).update({
      'status': 'accepted',
      'respondedAt': FieldValue.serverTimestamp(),
      'expiresAt': FieldValue.delete(),
      'aguardandoDestinoOnline': false,
    });
  }

  Future<void> rejeitarSolicitacao(String requestId) async {
    final req = await carregarSolicitacao(requestId);
    await _db.collection('matchRequests').doc(requestId).update({
      'status': 'rejected',
      'respondedAt': FieldValue.serverTimestamp(),
    });
    if (req != null) {
      await _reativarOfertaDoUsuario(req.fromUserId);
    }
  }

  Future<void> _reativarOfertaDoUsuario(String userId) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null || uid != userId) return;
    await _reativarMinhaOferta();
  }

  Future<MatchRequest?> carregarSolicitacao(String requestId) async {
    final snap = await _db.collection('matchRequests').doc(requestId).get();
    if (!snap.exists) return null;
    return MatchRequest.fromFirestore(snap.id, snap.data()!);
  }

  Stream<List<ActiveChat>> chatsAtivos() {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    return _db
        .collection('chats')
        .where('participants', arrayContains: uid)
        .snapshots()
        .map((s) => s.docs.map((d) {
              final data = d.data();
              final parts = List<String>.from(data['participants'] ?? []);
              final outroId = parts.firstWhere((p) => p != uid, orElse: () => '');
              return ActiveChat(
                matchId: d.id,
                otherUserId: outroId,
                otherUserName: data['user_${outroId}_name'] as String? ?? 'Colecionador',
                otherUserTelefone: data['user_${outroId}_tel'] as String? ?? '',
              );
            }).toList());
  }
}

double distanciaKm(double lat1, double lon1, double lat2, double lon2) {
  const r = 6371.0;
  final dLat = _rad(lat2 - lat1);
  final dLon = _rad(lon2 - lon1);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_rad(lat1)) * math.cos(_rad(lat2)) * math.sin(dLon / 2) * math.sin(dLon / 2);
  return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

double _rad(double deg) => deg * math.pi / 180;
