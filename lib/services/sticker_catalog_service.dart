import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/services.dart';
import '../models/models.dart';

class StickerCatalogService {
  StickerCatalogService._();
  static final instance = StickerCatalogService._();

  List<AlbumGroup> _grupos = [];
  List<Sticker> _stickers = [];
  bool _loaded = false;

  Future<void> load() async {
    if (_loaded) return;
    final raw = await rootBundle.loadString('assets/stickers_catalog.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;
    _grupos = (json['grupos'] as List)
        .map((e) => AlbumGroup.fromJson(e as Map<String, dynamic>))
        .toList();
    _stickers = (json['stickers'] as List)
        .map((e) => Sticker.fromJson(e as Map<String, dynamic>))
        .toList();
    _loaded = true;
  }

  List<AlbumGroup> get grupos => _grupos;
  List<Sticker> get all => _stickers;

  List<Sticker> porGrupo(String grupoId) =>
      _stickers.where((s) => s.grupo == grupoId).toList();

  List<Sticker> porSelecao(String grupoId, String selecao) => _stickers
      .where((s) => s.grupo == grupoId && s.selecao == selecao)
      .toList();

  Sticker? porId(String id) {
    try {
      return _stickers.firstWhere((s) => s.idUnico == id);
    } catch (_) {
      return null;
    }
  }
}

double distanciaKm(double lat1, double lon1, double lat2, double lon2) {
  const r = 6371.0;
  final dLat = _rad(lat2 - lat1);
  final dLon = _rad(lon2 - lon1);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_rad(lat1)) *
          math.cos(_rad(lat2)) *
          math.sin(dLon / 2) *
          math.sin(dLon / 2);
  return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

double _rad(double deg) => deg * math.pi / 180;
