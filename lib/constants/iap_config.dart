/// Compra in-app (App Store / Google Play) para liberar contato após match mútuo.
///
/// Crie o produto **Consumível** em:
/// - App Store Connect → app TROCA COPA 2026 → Compras dentro do app
/// - Google Play Console → Monetização → Produtos
class IapConfig {
  IapConfig._();

  static const matchUnlockProductId = 'com.mycompany.trocafigurinha.match_unlock';

  /// Exibido se a loja ainda não retornou o preço localizado.
  static const precoFallback = 'R\$ 0,99';
}
