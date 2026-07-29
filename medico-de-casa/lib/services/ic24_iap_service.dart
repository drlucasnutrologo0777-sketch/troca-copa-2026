import 'dart:async';

import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform, kIsWeb;
import 'package:in_app_purchase/in_app_purchase.dart';

import '../constants/ic24_iap_config.dart';

/// StoreKit — compra consumível da taxa de manutenção (ponte WebView → nativo).
class Ic24IapService {
  Ic24IapService._();
  static final instance = Ic24IapService._();

  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _subscription;
  Completer<PurchaseDetails>? _purchaseCompleter;

  bool _initialized = false;
  bool _storeDisponivel = false;
  ProductDetails? _product;

  bool get suportado => !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
  bool get lojaDisponivel => _storeDisponivel;
  ProductDetails? get product => _product;
  String get precoExibicao => _product?.price ?? Ic24IapConfig.precoFallback;

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
    final response = await _iap.queryProductDetails({Ic24IapConfig.platformFeeProductId});
    if (response.productDetails.isNotEmpty) {
      _product = response.productDetails.first;
    } else {
      _product = null;
    }
  }

  Future<Map<String, dynamic>> comprarTaxaManutencao({String? caregiverId}) async {
    await init();
    if (!_storeDisponivel) {
      throw StateError('App Store indisponível neste dispositivo.');
    }
    if (_product == null) {
      await _carregarProduto();
    }
    if (_product == null) {
      throw StateError(
        'Produto "${Ic24IapConfig.platformFeeProductId}" não encontrado. '
        'Crie o consumível no App Store Connect e aguarde propagação.',
      );
    }
    if (_purchaseCompleter != null && !_purchaseCompleter!.isCompleted) {
      throw StateError('Já existe uma compra em andamento.');
    }

    _purchaseCompleter = Completer<PurchaseDetails>();

    final iniciou = await _iap.buyConsumable(
      purchaseParam: PurchaseParam(
        productDetails: _product!,
        applicationUserName: caregiverId,
      ),
    );
    if (!iniciou) {
      _purchaseCompleter = null;
      throw StateError('Não foi possível abrir a tela de compra da App Store.');
    }

    final purchase = await _purchaseCompleter!.future.timeout(
      const Duration(minutes: 5),
      onTimeout: () {
        _purchaseCompleter = null;
        throw TimeoutException('Tempo esgotado aguardando confirmação da App Store.');
      },
    );

    if (purchase.pendingCompletePurchase) {
      await _iap.completePurchase(purchase);
    }

    return {
      'ok': true,
      'productId': purchase.productID,
      'transactionId': purchase.purchaseID ?? '',
      'localVerificationData': purchase.verificationData.localVerificationData,
      'serverVerificationData': purchase.verificationData.serverVerificationData,
    };
  }

  void _onPurchaseUpdate(List<PurchaseDetails> purchases) {
    for (final purchase in purchases) {
      if (purchase.productID != Ic24IapConfig.platformFeeProductId) continue;

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
