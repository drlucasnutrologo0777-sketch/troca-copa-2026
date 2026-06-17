import 'package:flutter_test/flutter_test.dart';
import 'package:troca_copa_app/constants/app_branding.dart';
import 'package:troca_copa_app/constants/iap_config.dart';

void main() {
  test('branding e IAP estão definidos', () {
    expect(AppBranding.appName, 'TROCAR FIGURINHAS');
    expect(AppBranding.disclaimer, contains('FIFA'));
    expect(IapConfig.matchUnlockProductId, 'com.mycompany.trocafigurinha.match_unlock');
    expect(IapConfig.valorMatch, greaterThan(0));
  });
}
