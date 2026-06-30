/// IAP Apple — taxa de manutenção Idoso Care 24H (US$ 1,99 / R$ 10,29).
///
/// App Store Connect → com.idosocare24h.app → Compras dentro do app
/// Produto **consumível**: `ic24_taxa_manutencao` — preço tier US$ 1,99
class Ic24IapConfig {
  Ic24IapConfig._();

  static const platformFeeProductId = 'ic24_taxa_manutencao';
  static const precoFallback = 'US\$ 1,99';
  static const precoReferenciaBrl = 'R\$ 10,29';
}
