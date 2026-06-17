import 'package:flutter_test/flutter_test.dart';
import 'package:troca_copa_app/constants/iap_config.dart';

void main() {
  test('IAP configurado para liberar match', () {
    expect(IapConfig.matchUnlockProductId, 'com.mycompany.trocafigurinha.match_unlock');
    expect(IapConfig.valorMatch, greaterThan(0));
  });
}
