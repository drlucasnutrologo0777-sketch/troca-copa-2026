/// IAP Apple — taxa de manutenção Médico de Casa (US$ 4,99 / R$ 25,00).
///
/// App Store Connect → Compras dentro do app
/// Produto **consumível**: `ic24_taxa_manutencao` — preço tier US$ 4,99
class Ic24IapConfig {
  Ic24IapConfig._();

  static const platformFeeProductId = 'ic24_taxa_manutencao';
  static const precoFallback = 'US\$ 4,99';
  static const precoReferenciaBrl = 'R\$ 25,00';
}
