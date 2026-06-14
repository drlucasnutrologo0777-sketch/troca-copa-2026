import 'package:cloud_firestore/cloud_firestore.dart';

class Sticker {
  Sticker({
    required this.idUnico,
    required this.grupo,
    required this.selecao,
    required this.nomeJogador,
    required this.imagem,
  });

  factory Sticker.fromJson(Map<String, dynamic> j) => Sticker(
        idUnico: j['idUnico'] as String,
        grupo: j['grupo'] as String,
        selecao: j['selecao'] as String,
        nomeJogador: j['nomeJogador'] as String,
        imagem: j['imagem'] as String,
      );

  final String idUnico;
  final String grupo;
  final String selecao;
  final String nomeJogador;
  final String imagem;

  String get numeroExibicao {
    final parts = idUnico.split('_');
    if (parts.length < 2) return '';
    return parts.last.replaceFirst(RegExp(r'^0+'), '');
  }
}

class AlbumGroup {
  AlbumGroup({required this.id, required this.nome, required this.selecoes});

  factory AlbumGroup.fromJson(Map<String, dynamic> j) => AlbumGroup(
        id: j['id'] as String,
        nome: j['nome'] as String,
        selecoes: (j['selecoes'] as List)
            .map((e) => AlbumSelection.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  final String id;
  final String nome;
  final List<AlbumSelection> selecoes;
}

class AlbumSelection {
  AlbumSelection({required this.nome, required this.codigo});

  factory AlbumSelection.fromJson(Map<String, dynamic> j) => AlbumSelection(
        nome: j['nome'] as String,
        codigo: j['codigo'] as String,
      );

  final String nome;
  final String codigo;
}

class UserProfile {
  UserProfile({
    required this.id,
    required this.nome,
    required this.email,
    required this.telefone,
    required this.endereco,
    required this.cidade,
    required this.estado,
    required this.latitude,
    required this.longitude,
    this.fotoUrl,
    this.raioTrocaKm = 10,
    this.isOnline = false,
  });

  final String id;
  final String nome;
  final String email;
  final String telefone;
  final String endereco;
  final String cidade;
  final String estado;
  final double latitude;
  final double longitude;
  final String? fotoUrl;
  final double raioTrocaKm;
  final bool isOnline;

  bool get cadastroCompleto =>
      nome.trim().isNotEmpty &&
      email.trim().isNotEmpty &&
      telefone.trim().isNotEmpty &&
      endereco.trim().isNotEmpty &&
      cidade.trim().isNotEmpty &&
      estado.trim().isNotEmpty;

  Map<String, dynamic> toMap() => {
        'nome': nome,
        'email': email,
        'telefone': telefone,
        'endereco': endereco,
        'cidade': cidade,
        'estado': estado,
        'latitude': latitude,
        'longitude': longitude,
        'raioTrocaKm': raioTrocaKm,
        'isOnline': isOnline,
        if (fotoUrl != null) 'fotoUrl': fotoUrl,
      };
}

class TradeOffer {
  TradeOffer({
    required this.id,
    required this.userId,
    required this.stickerIds,
    required this.wantedStickerIds,
    required this.isActive,
    this.latitude = 0,
    this.longitude = 0,
    this.aceitaQualquerDiferente = false,
  });

  factory TradeOffer.fromFirestore(String id, Map<String, dynamic> d) => TradeOffer(
        id: id,
        userId: d['userId'] as String? ?? '',
        stickerIds: List<String>.from(d['stickerIds'] ?? []),
        wantedStickerIds: List<String>.from(d['wantedStickerIds'] ?? []),
        isActive: d['isActive'] as bool? ?? true,
        latitude: (d['latitude'] as num?)?.toDouble() ?? 0,
        longitude: (d['longitude'] as num?)?.toDouble() ?? 0,
        aceitaQualquerDiferente: d['aceitaQualquerDiferente'] as bool? ?? false,
      );

  static const maxStickers = 7;

  final String id;
  final String userId;
  final List<String> stickerIds;
  final List<String> wantedStickerIds;
  final bool isActive;
  final double latitude;
  final double longitude;
  final bool aceitaQualquerDiferente;
}

enum MatchPrioridade {
  especifica(1, 'Prioridade 1 · Pedido específico'),
  qualquerSelecao(2, 'Prioridade 2 · Qualquer da seleção'),
  qualquerDiferente(3, 'Prioridade 3 · Qualquer que não tenho');

  const MatchPrioridade(this.ordem, this.rotulo);
  final int ordem;
  final String rotulo;
}

class MatchPreview {
  MatchPreview({
    required this.id,
    required this.otherUserId,
    required this.otherUserName,
    required this.otherUserCidade,
    required this.distanceKm,
    required this.euDou,
    required this.euRecebo,
    required this.prioridade,
    this.otherUserOnline = false,
  });

  final String id;
  final String otherUserId;
  final String otherUserName;
  final String otherUserCidade;
  final double distanceKm;
  final List<String> euDou;
  final List<String> euRecebo;
  final MatchPrioridade prioridade;
  final bool otherUserOnline;

  int get matchCount => euDou.length + euRecebo.length;
}

enum MatchRequestStatus { pending, accepted, rejected, paid, expired }

class MatchRequest {
  MatchRequest({
    required this.id,
    required this.fromUserId,
    required this.toUserId,
    required this.fromUserName,
    required this.matchId,
    required this.status,
    required this.euDou,
    required this.euRecebo,
    required this.distanceKm,
    this.otherUserName,
    this.toUserName,
    this.expiresAt,
    this.aguardandoDestinoOnline = false,
  });

  factory MatchRequest.fromFirestore(String id, Map<String, dynamic> d) => MatchRequest(
        id: id,
        fromUserId: d['fromUserId'] as String? ?? '',
        toUserId: d['toUserId'] as String? ?? '',
        fromUserName: d['fromUserName'] as String? ?? '',
        matchId: d['matchId'] as String? ?? '',
        status: _statusFromString(d['status'] as String?),
        euDou: List<String>.from(d['euDou'] ?? []),
        euRecebo: List<String>.from(d['euRecebo'] ?? []),
        distanceKm: (d['distanceKm'] as num?)?.toDouble() ?? 0,
        otherUserName: d['otherUserName'] as String?,
        toUserName: d['toUserName'] as String?,
        expiresAt: (d['expiresAt'] as Timestamp?)?.toDate(),
        aguardandoDestinoOnline: d['aguardandoDestinoOnline'] as bool? ?? false,
      );

  final String id;
  final String fromUserId;
  final String toUserId;
  final String fromUserName;
  final String matchId;
  final MatchRequestStatus status;
  final List<String> euDou;
  final List<String> euRecebo;
  final double distanceKm;
  final String? otherUserName;
  final String? toUserName;
  final DateTime? expiresAt;
  final bool aguardandoDestinoOnline;

  bool get isPending => status == MatchRequestStatus.pending;
  bool get isAccepted => status == MatchRequestStatus.accepted;
  bool get isPaid => status == MatchRequestStatus.paid;
  bool get isExpired => status == MatchRequestStatus.expired;

  Duration? get tempoRestante {
    if (expiresAt == null) return null;
    final restante = expiresAt!.difference(DateTime.now());
    return restante.isNegative ? Duration.zero : restante;
  }

  static MatchRequestStatus _statusFromString(String? s) {
    switch (s) {
      case 'accepted':
        return MatchRequestStatus.accepted;
      case 'rejected':
        return MatchRequestStatus.rejected;
      case 'paid':
        return MatchRequestStatus.paid;
      case 'expired':
        return MatchRequestStatus.expired;
      default:
        return MatchRequestStatus.pending;
    }
  }
}

class ActiveChat {
  ActiveChat({
    required this.matchId,
    required this.otherUserId,
    required this.otherUserName,
    required this.otherUserTelefone,
  });

  factory ActiveChat.fromMap(String matchId, Map<String, dynamic> d) => ActiveChat(
        matchId: matchId,
        otherUserId: d['otherUserId'] as String? ?? '',
        otherUserName: d['otherUserName'] as String? ?? '',
        otherUserTelefone: d['otherUserTelefone'] as String? ?? '',
      );

  final String matchId;
  final String otherUserId;
  final String otherUserName;
  final String otherUserTelefone;
}

enum SearchMode { specific, selection, anyMissing }

enum MutualMatchStatus { confirmed, bothPaid, completed }

class MutualMatch {
  MutualMatch({
    required this.id,
    required this.userA,
    required this.userB,
    required this.userAName,
    required this.userBName,
    required this.distanceKm,
    required this.userADou,
    required this.userARecebo,
    required this.userBDou,
    required this.userBRecebo,
    required this.paidUserA,
    required this.paidUserB,
    required this.concluidoUserA,
    required this.concluidoUserB,
    required this.status,
  });

  factory MutualMatch.fromFirestore(String id, Map<String, dynamic> d) => MutualMatch(
        id: id,
        userA: d['userA'] as String? ?? '',
        userB: d['userB'] as String? ?? '',
        userAName: d['userAName'] as String? ?? '',
        userBName: d['userBName'] as String? ?? '',
        distanceKm: (d['distanceKm'] as num?)?.toDouble() ?? 0,
        userADou: List<String>.from(d['userA_dou'] ?? []),
        userARecebo: List<String>.from(d['userA_recebo'] ?? []),
        userBDou: List<String>.from(d['userB_dou'] ?? []),
        userBRecebo: List<String>.from(d['userB_recebo'] ?? []),
        paidUserA: d['paidUserA'] as bool? ?? false,
        paidUserB: d['paidUserB'] as bool? ?? false,
        concluidoUserA: d['concluidoUserA'] as bool? ?? false,
        concluidoUserB: d['concluidoUserB'] as bool? ?? false,
        status: _statusFromString(d['status'] as String?),
      );

  final String id;
  final String userA;
  final String userB;
  final String userAName;
  final String userBName;
  final double distanceKm;
  final List<String> userADou;
  final List<String> userARecebo;
  final List<String> userBDou;
  final List<String> userBRecebo;
  final bool paidUserA;
  final bool paidUserB;
  final bool concluidoUserA;
  final bool concluidoUserB;
  final MutualMatchStatus status;

  bool envolve(String uid) => uid == userA || uid == userB;

  String otherUserId(String me) => me == userA ? userB : userA;

  String otherUserName(String me) => me == userA ? userBName : userAName;

  List<String> meuDou(String me) => me == userA ? userADou : userBDou;

  List<String> meuRecebo(String me) => me == userA ? userARecebo : userBRecebo;

  List<String> outroDou(String me) => me == userA ? userBDou : userADou;

  List<String> outroRecebo(String me) => me == userA ? userBRecebo : userARecebo;

  bool euPaguei(String me) => me == userA ? paidUserA : paidUserB;

  bool outroPagou(String me) => me == userA ? paidUserB : paidUserA;

  bool get ambosPagaram => paidUserA && paidUserB;

  bool get aguardandoPagamento => status == MutualMatchStatus.confirmed;

  static MutualMatchStatus _statusFromString(String? s) {
    switch (s) {
      case 'both_paid':
        return MutualMatchStatus.bothPaid;
      case 'completed':
        return MutualMatchStatus.completed;
      default:
        return MutualMatchStatus.confirmed;
    }
  }
}

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.senderId,
    required this.text,
    required this.createdAt,
    this.type = 'text',
    this.latitude,
    this.longitude,
  });

  factory ChatMessage.fromFirestore(String id, Map<String, dynamic> d) => ChatMessage(
        id: id,
        senderId: d['senderId'] as String? ?? '',
        text: d['text'] as String? ?? '',
        createdAt: (d['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
        type: d['type'] as String? ?? 'text',
        latitude: (d['latitude'] as num?)?.toDouble(),
        longitude: (d['longitude'] as num?)?.toDouble(),
      );

  final String id;
  final String senderId;
  final String text;
  final DateTime createdAt;
  final String type;
  final double? latitude;
  final double? longitude;
}
