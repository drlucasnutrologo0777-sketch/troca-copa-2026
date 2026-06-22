import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../services/auth_service.dart';
import '../services/mutual_match_service.dart';
import '../services/offer_match_service.dart';
import '../services/presence_service.dart';
import '../services/aviso_service.dart';
import '../utils/auth_erro_util.dart';

class AppState extends ChangeNotifier {
  UserProfile? profile;
  List<String> ofertaAtual = [];
  List<String> desejoAtual = [];
  bool aceitaQualquerDiferente = false;
  List<MatchPreview> ultimosMatches = [];
  List<MatchPreview> candidatosDeck = [];
  bool carregando = false;
  bool online = false;
  String? erro;
  String? sucesso;

  Future<void> init() async {
    if (AuthService.instance.currentUser != null) {
      profile = await AuthService.instance.carregarPerfil();
      if (profile == null) {
        // Auth sem documento no Firestore — cadastro incompleto; não deslogar.
        notifyListeners();
        return;
      }
      online = profile?.isOnline ?? false;
      final oferta = await OfferService.instance.minhaOferta();
      ofertaAtual = oferta?.stickerIds ?? [];
      desejoAtual = oferta?.wantedStickerIds ?? [];
      aceitaQualquerDiferente = oferta?.aceitaQualquerDiferente ?? false;
    }
    notifyListeners();
  }

  Future<bool> ficarOnline() async {
    limparMensagens();
    try {
      final r = await PresenceService.instance.ficarOnline();
      if (r.ok) {
        online = true;
        profile = await AuthService.instance.carregarPerfil();
        notifyListeners();
        return true;
      }
      erro = r.erro;
      online = false;
      notifyListeners();
      return false;
    } catch (e) {
      erro = 'Erro ao ficar online. Tente novamente.';
      online = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> ficarOffline() async {
    await PresenceService.instance.ficarOffline();
    online = false;
    profile = await AuthService.instance.carregarPerfil();
    notifyListeners();
  }

  void limparMensagens() {
    erro = null;
    sucesso = null;
  }

  Future<bool> loginEmail({required String email, required String senha}) async {
    carregando = true;
    limparMensagens();
    notifyListeners();
    try {
      profile = await AuthService.instance.loginEmail(email: email, senha: senha);
      if (profile != null && profile!.cadastroCompleto) {
        final oferta = await OfferService.instance.minhaOferta();
        ofertaAtual = oferta?.stickerIds ?? [];
        desejoAtual = oferta?.wantedStickerIds ?? [];
        aceitaQualquerDiferente = oferta?.aceitaQualquerDiferente ?? false;
      }
      return AuthService.instance.currentUser != null;
    } catch (e) {
      erro = mensagemAuthErro(e);
      return false;
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  Future<bool> completarCadastro({
    required String nome,
    required String telefone,
    required String endereco,
    required String cidade,
    required String estado,
    Uint8List? fotoBytes,
    String? fotoNome,
  }) async {
    carregando = true;
    limparMensagens();
    notifyListeners();
    try {
      profile = await AuthService.instance.completarCadastro(
        nome: nome,
        telefone: telefone,
        endereco: endereco,
        cidade: cidade,
        estado: estado,
        fotoBytes: fotoBytes,
        fotoNome: fotoNome,
      );
      sucesso = 'Cadastro concluído com sucesso!';
      return true;
    } catch (e) {
      erro = mensagemAuthErro(e);
      return false;
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  Future<bool> cadastrar({
    required String nome,
    required String email,
    required String senha,
    required String telefone,
    required String endereco,
    required String cidade,
    required String estado,
    Uint8List? fotoBytes,
    String? fotoNome,
  }) async {
    carregando = true;
    limparMensagens();
    notifyListeners();
    try {
      profile = await AuthService.instance.cadastrar(
        nome: nome,
        email: email,
        senha: senha,
        telefone: telefone,
        endereco: endereco,
        cidade: cidade,
        estado: estado,
        fotoBytes: fotoBytes,
        fotoNome: fotoNome,
      );
      sucesso = 'Cadastro concluído com sucesso!';
      return true;
    } catch (e) {
      erro = mensagemAuthErro(e);
      return false;
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  Future<bool> esqueciSenha(String email) async {
    carregando = true;
    limparMensagens();
    notifyListeners();
    try {
      await AuthService.instance.esqueciSenha(email);
      sucesso = 'E-mail de recuperação enviado! Verifique sua caixa de entrada.';
      return true;
    } catch (e) {
      erro = mensagemAuthErro(e);
      return false;
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  void adicionarFigurinha(String id) {
    if (ofertaAtual.length >= TradeOffer.maxStickers) return;
    if (ofertaAtual.contains(id)) return;
    ofertaAtual = [...ofertaAtual, id];
    notifyListeners();
  }

  void removerFigurinha(String id) {
    ofertaAtual = ofertaAtual.where((s) => s != id).toList();
    notifyListeners();
  }

  void setAceitaQualquerDiferente(bool valor) {
    aceitaQualquerDiferente = valor;
    if (valor) desejoAtual = [];
    notifyListeners();
  }

  void adicionarDesejo(String id) {
    if (aceitaQualquerDiferente) return;
    if (desejoAtual.length >= TradeOffer.maxStickers) return;
    if (desejoAtual.contains(id)) return;
    desejoAtual = [...desejoAtual, id];
    notifyListeners();
  }

  void removerDesejo(String id) {
    desejoAtual = desejoAtual.where((s) => s != id).toList();
    notifyListeners();
  }

  Future<bool> publicarOferta() async {
    if (ofertaAtual.isEmpty) return false;
    carregando = true;
    notifyListeners();
    try {
      await OfferService.instance.publicarOferta(
        stickerIds: ofertaAtual,
        wantedStickerIds: desejoAtual,
        aceitaQualquerDiferente: aceitaQualquerDiferente,
      );
      return true;
    } catch (e) {
      erro = e.toString();
      return false;
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  Future<bool> apagarMinhaOferta() async {
    carregando = true;
    limparMensagens();
    notifyListeners();
    try {
      await OfferService.instance.apagarOferta();
      ofertaAtual = [];
      desejoAtual = [];
      aceitaQualquerDiferente = false;
      sucesso = 'Oferta apagada.';
      return true;
    } catch (e) {
      erro = e.toString();
      return false;
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  void limparFormularioTroca() {
    ofertaAtual = [];
    desejoAtual = [];
    aceitaQualquerDiferente = false;
    limparMensagens();
    notifyListeners();
  }

  Future<void> recarregarOferta() async {
    final oferta = await OfferService.instance.minhaOferta();
    ofertaAtual = oferta?.stickerIds ?? [];
    desejoAtual = oferta?.wantedStickerIds ?? [];
    aceitaQualquerDiferente = oferta?.aceitaQualquerDiferente ?? false;
    notifyListeners();
  }

  Future<bool> registrarTroca({
    required String cidade,
    required String estado,
    required double raioKm,
  }) async {
    if (ofertaAtual.isEmpty) {
      erro = 'Selecione as figurinhas que você OFERECE.';
      notifyListeners();
      return false;
    }
    if (!aceitaQualquerDiferente && desejoAtual.isEmpty) {
      erro = 'Selecione o que QUER RECEBER ou marque "qualquer figurinha diferente".';
      notifyListeners();
      return false;
    }
    carregando = true;
    limparMensagens();
    notifyListeners();
    try {
      profile = await AuthService.instance.atualizarPreferenciasTroca(
        cidade: cidade,
        estado: estado,
        raioKm: raioKm,
      );
      await OfferService.instance.publicarOferta(
        stickerIds: ofertaAtual,
        wantedStickerIds: desejoAtual,
        aceitaQualquerDiferente: aceitaQualquerDiferente,
      );
      sucesso = aceitaQualquerDiferente
          ? 'Troca registrada! Oferece ${ofertaAtual.length} · Quer qualquer diferente'
          : 'Troca registrada! Oferece ${ofertaAtual.length} · Quer ${desejoAtual.length}';
      return true;
    } catch (e) {
      erro = e.toString();
      return false;
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  Future<void> atualizarLocalBusca({
    required String cidade,
    required String estado,
    required double raioKm,
  }) async {
    profile = await AuthService.instance.atualizarPreferenciasTroca(
      cidade: cidade,
      estado: estado,
      raioKm: raioKm,
    );
    notifyListeners();
  }

  Future<TradeOffer?> _minhaOfertaAtual() async {
    var minha = await OfferService.instance.minhaOferta();
    if (minha != null || profile == null) return minha;
    return TradeOffer(
      id: profile!.id,
      userId: profile!.id,
      stickerIds: ofertaAtual,
      wantedStickerIds: desejoAtual,
      isActive: true,
      latitude: profile!.latitude,
      longitude: profile!.longitude,
      aceitaQualquerDiferente: aceitaQualquerDiferente,
    );
  }

  Future<void> buscarCandidatos({
    required double raioKm,
    SearchMode mode = SearchMode.anyMissing,
    String? stickerAlvo,
  }) async {
    carregando = true;
    notifyListeners();
    try {
      final minha = await _minhaOfertaAtual();
      if (minha == null) {
        erro = 'Cadastre sua oferta de troca antes de buscar matches.';
        candidatosDeck = [];
        return;
      }
      candidatosDeck = await MutualMatchService.instance.buscarCandidatos(
        minhaOferta: minha,
        raioKm: raioKm,
        mode: mode,
        stickerAlvo: stickerAlvo,
      );
      ultimosMatches = candidatosDeck;
    } catch (e) {
      erro = e.toString();
      candidatosDeck = [];
      ultimosMatches = [];
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  Future<bool> atualizarFoto({
    required Uint8List fotoBytes,
    String? fotoNome,
  }) async {
    carregando = true;
    limparMensagens();
    notifyListeners();
    try {
      profile = await AuthService.instance.atualizarFoto(
        fotoBytes: fotoBytes,
        fotoNome: fotoNome,
      );
      sucesso = 'Foto atualizada!';
      return true;
    } catch (e) {
      erro = 'Não foi possível salvar a foto. Verifique sua conexão e tente novamente.';
      return false;
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  Future<bool> apagarConta({required String senha}) async {
    carregando = true;
    limparMensagens();
    notifyListeners();
    try {
      await AuthService.instance.apagarConta(senha: senha);
      profile = null;
      ofertaAtual = [];
      desejoAtual = [];
      ultimosMatches = [];
      candidatosDeck = [];
      online = false;
      AvisoService.instance.reset();
      return true;
    } catch (e) {
      erro = mensagemAuthErro(e);
      return false;
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  Future<void> sair() async {
    await AuthService.instance.sair();
    AvisoService.instance.reset();
    profile = null;
    online = false;
    ofertaAtual = [];
    desejoAtual = [];
    ultimosMatches = [];
    candidatosDeck = [];
    notifyListeners();
  }
}
