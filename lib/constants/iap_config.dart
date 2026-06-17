/// Compra in-app (App Store / Google Play) para liberar contato após match mútuo.
///
/// Crie o produto **Consumível** em:
/// - App Store Connect → Trocar Figurinhas → Compras dentro do app
/// - Google Play Console → Monetização → Produtos
class IapConfig {
  IapConfig._();

  static const matchUnlockProductId = 'com.mycompany.trocafigurinha.match_unlock';

  /// Valor de referência do produto consumível (loja pode localizar o preço).
  static const valorMatch = 0.99;

  /// Exibido se a loja ainda não retornou o preço localizado.
  static const precoFallback = 'R\$ 0,99';
}
