import '../models/models.dart';
import '../services/sticker_catalog_service.dart';

/// Token especial: ANY:grupo:seleção = qualquer jogador da seleção.
class StickerTokenUtil {
  StickerTokenUtil._();

  static const prefix = 'ANY:';

  static String qualquerSelecao(String grupo, String selecao) => '$prefix$grupo:$selecao';

  static bool isQualquerSelecao(String id) => id.startsWith(prefix);

  static String rotulo(String id) {
    if (!isQualquerSelecao(id)) {
      final s = StickerCatalogService.instance.porId(id);
      return s?.idUnico ?? id;
    }
    final rest = id.substring(prefix.length);
    final sep = rest.indexOf(':');
    final selecao = sep >= 0 ? rest.substring(sep + 1) : rest;
    return 'Qualquer jogador · $selecao';
  }

  static bool stickerNaSelecao(String anyToken, Sticker sticker) {
    if (!isQualquerSelecao(anyToken)) return false;
    final rest = anyToken.substring(prefix.length);
    final sep = rest.indexOf(':');
    if (sep < 0) return false;
    final grupo = rest.substring(0, sep);
    final selecao = rest.substring(sep + 1);
    return sticker.grupo == grupo && sticker.selecao == selecao;
  }

  static bool stickerNoConjunto(String stickerId, List<String> tokens) {
    final s = StickerCatalogService.instance.porId(stickerId);
    if (s == null) return tokens.contains(stickerId);
    for (final t in tokens) {
      if (t == stickerId) return true;
      if (isQualquerSelecao(t) && stickerNaSelecao(t, s)) return true;
    }
    return false;
  }

  /// O que [ofereço] satisfaz o que [querem].
  static List<String> cruzamento(List<String> ofereco, List<String> querem) {
    final out = <String>[];
    for (final o in ofereco) {
      for (final q in querem) {
        if (_combina(o, q)) {
          out.add(_rotuloCruzamento(o, q));
          break;
        }
      }
    }
    return out;
  }

  static String _rotuloCruzamento(String o, String q) {
    if (isQualquerSelecao(o)) return o;
    if (isQualquerSelecao(q)) return q;
    return o;
  }

  static bool _combina(String oferta, String desejo) {
    if (oferta == desejo) return true;

    final stickerOferta = isQualquerSelecao(oferta) ? null : StickerCatalogService.instance.porId(oferta);
    final stickerDesejo = isQualquerSelecao(desejo) ? null : StickerCatalogService.instance.porId(desejo);

    if (isQualquerSelecao(desejo) && stickerOferta != null) {
      return stickerNaSelecao(desejo, stickerOferta);
    }
    if (isQualquerSelecao(oferta) && stickerDesejo != null) {
      return stickerNaSelecao(oferta, stickerDesejo);
    }
    if (isQualquerSelecao(oferta) && isQualquerSelecao(desejo)) {
      return oferta == desejo;
    }
    return false;
  }

  static List<String> figurinhasDiferentesDasMinhas(
    List<String> figurinhasOutro,
    List<String> minhasOfertas,
  ) {
    return figurinhasOutro
        .where((id) => !stickerNoConjunto(id, minhasOfertas))
        .toList();
  }

  /// 1 = pedido específico, 2 = qualquer da seleção, 3 = qualquer diferente.
  static MatchPrioridade prioridadeDoMatch(TradeOffer minha, List<String> euRecebo) {
    if (euRecebo.isEmpty) return MatchPrioridade.qualquerDiferente;

    for (final rec in euRecebo) {
      if (!isQualquerSelecao(rec)) {
        for (final w in minha.wantedStickerIds) {
          if (!isQualquerSelecao(w) && w == rec) {
            return MatchPrioridade.especifica;
          }
        }
      }
    }

    for (final w in minha.wantedStickerIds) {
      if (!isQualquerSelecao(w) && euRecebo.contains(w)) {
        return MatchPrioridade.especifica;
      }
    }

    for (final rec in euRecebo) {
      if (isQualquerSelecao(rec)) return MatchPrioridade.qualquerSelecao;
      final sticker = StickerCatalogService.instance.porId(rec);
      if (sticker != null) {
        for (final w in minha.wantedStickerIds) {
          if (isQualquerSelecao(w) && stickerNaSelecao(w, sticker)) {
            return MatchPrioridade.qualquerSelecao;
          }
        }
      }
    }

    if (minha.aceitaQualquerDiferente) {
      return MatchPrioridade.qualquerDiferente;
    }

    return MatchPrioridade.qualquerSelecao;
  }
}
