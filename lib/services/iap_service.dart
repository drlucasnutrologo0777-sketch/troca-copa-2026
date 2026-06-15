import 'dart:async';
import 'dart:io';

import 'package:in_app_purchase/in_app_purchase.dart';

import '../constants/iap_config.dart';

class IapService {
  IapService._();
  static final instance = IapService._();

  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _subscription;
  Completer<PurchaseDetails>? _purchaseCompleter;

  bool _initialized = false;
  bool _storeDisponivel = false;
  ProductDetails? _product;

  bool get suportado => Platform.isIOS || Platform.isAndroid;
  bool get lojaDisponivel => _storeDisponivel;
  bool get produtoCarregado => _product != null;
  ProductDetails? get product => _product;
  String get precoExibicao => _product?.price ?? IapConfig.precoFallback;

  Future<void> init() async {
    if (!suportado || _initialized) return;
    _initialized = true;

    _storeDisponivel = await _iap.isAvailable();
    if (!_storeDisponivel) return;

    _subscription ??= _iap.purchaseStream.listen(
      _onPurchaseUpdate,
      onError: (Object error) {
        if (_purchaseCompleter != null && !_purchaseCompleter!.isCompleted) {
          _purchaseCompleter!.completeError(error);
          _purchaseCompleter = null;
        }
      },
    );

    await _carregarProduto();
  }

  Future<void> _carregarProduto() async {
    final response = await _iap.queryProductDetails({IapConfig.matchUnlockProductId});
    if (response.notFoundIDs.isNotEmpty && response.productDetails.isEmpty) {
      _product = null;
      return;
    }
    if (response.productDetails.isNotEmpty) {
      _product = response.productDetails.first;
    }
  }

  Future<PurchaseDetails> comprarLiberacaoMatch(String mutualMatchId) async {
    await init();
    if (!_storeDisponivel) {
      throw StateError('Loja indisponível neste dispositivo.');
    }
    if (_product == null) {
      await _carregarProduto();
    }
    if (_product == null) {
      throw StateError(
        'Produto IAP não encontrado. Crie "${IapConfig.matchUnlockProductId}" na App Store Connect / Play Console.',
      );
    }
    if (_purchaseCompleter != null && !_purchaseCompleter!.isCompleted) {
      throw StateError('Já existe uma compra em andamento.');
    }

    _purchaseCompleter = Completer<PurchaseDetails>();

    final iniciou = await _iap.buyConsumable(
      purchaseParam: PurchaseParam(
        productDetails: _product!,
        applicationUserName: mutualMatchId,
      ),
    );
    if (!iniciou) {
      _purchaseCompleter = null;
      throw StateError('Não foi possível abrir a tela de compra.');
    }

    return _purchaseCompleter!.future.timeout(
      const Duration(minutes: 5),
      onTimeout: () {
        _purchaseCompleter = null;
        throw TimeoutException('Tempo esgotado aguardando confirmação da loja.');
      },
    );
  }

  Future<void> finalizarCompra(PurchaseDetails purchase) async {
    if (purchase.pendingCompletePurchase) {
      await _iap.completePurchase(purchase);
    }
  }

  void _onPurchaseUpdate(List<PurchaseDetails> purchases) {
    for (final purchase in purchases) {
      if (purchase.productID != IapConfig.matchUnlockProductId) continue;

      switch (purchase.status) {
        case PurchaseStatus.pending:
          break;
        case PurchaseStatus.error:
          if (_purchaseCompleter != null && !_purchaseCompleter!.isCompleted) {
            _purchaseCompleter!.completeError(
              Exception(purchase.error?.message ?? 'Erro na compra'),
            );
          }
          _purchaseCompleter = null;
        case PurchaseStatus.canceled:
          if (_purchaseCompleter != null && !_purchaseCompleter!.isCompleted) {
            _purchaseCompleter!.completeError(Exception('Compra cancelada'));
          }
          _purchaseCompleter = null;
        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          if (_purchaseCompleter != null && !_purchaseCompleter!.isCompleted) {
            _purchaseCompleter!.complete(purchase);
          }
      }
    }
  }

  void dispose() {
    _subscription?.cancel();
    _subscription = null;
  }
}
