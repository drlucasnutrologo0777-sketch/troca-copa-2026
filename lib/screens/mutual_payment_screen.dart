import 'dart:io';

import 'package:flutter/material.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

import '../services/iap_service.dart';
import '../services/mutual_match_service.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';
import 'chat_room_screen.dart';

/// Pagamento do match — somente In-App Purchase (exigência App Store 3.1.1).
class MutualPaymentScreen extends StatefulWidget {
  const MutualPaymentScreen({super.key, required this.mutualMatchId});

  final String mutualMatchId;

  @override
  State<MutualPaymentScreen> createState() => _MutualPaymentScreenState();
}

class _MutualPaymentScreenState extends State<MutualPaymentScreen> {
  bool _pago = false;
  bool _carregando = false;
  bool _iapPronto = false;
  String _preco = IapService.instance.precoExibicao;

  @override
  void initState() {
    super.initState();
    _inicializarIap();
  }

  Future<void> _inicializarIap() async {
    await IapService.instance.init();
    if (!mounted) return;
    setState(() {
      _iapPronto = IapService.instance.lojaDisponivel && IapService.instance.produtoCarregado;
      _preco = IapService.instance.precoExibicao;
    });
  }

  double _valorCompra(ProductDetails? product) {
    if (product == null) return 0.99;
    final raw = double.tryParse(product.rawPrice.toString());
    return raw ?? 0.99;
  }

  String get _platformLabel => Platform.isIOS ? 'apple' : 'google';

  Future<void> _comprarIap() async {
    setState(() => _carregando = true);
    try {
      final purchase = await IapService.instance.comprarLiberacaoMatch(widget.mutualMatchId);
      final product = IapService.instance.product;
      await MutualMatchService.instance.confirmarPagamentoIap(
        widget.mutualMatchId,
        IapPurchaseInfo(
          productId: purchase.productID,
          transactionId: purchase.purchaseID ??
              purchase.verificationData.localVerificationData.toString(),
          platform: _platformLabel,
          purchaseToken: purchase.verificationData.serverVerificationData,
          valor: _valorCompra(product),
        ),
      );
      await IapService.instance.finalizarCompra(purchase);
      setState(() => _pago = true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Compra $_preco confirmada!', style: const TextStyle(fontWeight: FontWeight.w700)),
            backgroundColor: CopaColors.verde,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e')));
      }
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: const Text(
                'Compra in-app — Match confirmado',
                style: TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900, fontSize: 16),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: CopaCard(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (!_pago) ...[
                        Text(
                          _preco,
                          style: const TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                            color: CopaColors.verde,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Pagamento pela App Store.\n'
                          'Libera contato e chat após os dois comprarem.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        if (!_iapPronto)
                          const Padding(
                            padding: EdgeInsets.only(bottom: 12),
                            child: Text(
                              'Produto IAP: com.mycompany.trocafigurinha.match_unlock\n'
                              'Confirme que está "Pronto para envio" na App Store Connect.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.orange, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ElevatedButton.icon(
                          onPressed: (_carregando || !_iapPronto) ? null : _comprarIap,
                          icon: const Icon(Icons.shopping_bag),
                          label: _carregando
                              ? const SizedBox(
                                  height: 22,
                                  width: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Text('COMPRAR · $_preco'),
                        ),
                      ] else ...[
                        const Icon(Icons.check_circle, color: CopaColors.verde, size: 64),
                        const SizedBox(height: 16),
                        const Text(
                          'Pagamento registrado!',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Quando os dois pagarem, contato e chat são liberados.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ChatRoomScreen(mutualMatchId: widget.mutualMatchId),
                            ),
                          ),
                          icon: const Icon(Icons.chat),
                          label: const Text('IR PARA CHAT'),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
