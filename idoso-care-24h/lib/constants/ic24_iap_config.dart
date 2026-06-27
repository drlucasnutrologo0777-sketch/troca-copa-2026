/// IAP Apple — taxa de manutenção Idoso Care 24H (7%).
///
/// App Store Connect → com.idosocare24h.app → Compras dentro do app
/// Produto **consumível**: `ic24_taxa_manutencao`
class Ic24IapConfig {
  Ic24IapConfig._();

  static const platformFeeProductId = 'ic24_taxa_manutencao';
  static const precoFallback = 'Consulte App Store';
}
