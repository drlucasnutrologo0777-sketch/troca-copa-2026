import 'package:flutter_test/flutter_test.dart';
import 'package:troca_copa_app/constants/iap_config.dart';
import 'package:troca_copa_app/constants/pix_config.dart';

void main() {
  test('configurações de pagamento estão definidas', () {
    expect(IapConfig.matchUnlockProductId, 'com.mycompany.trocafigurinha.match_unlock');
    expect(PixConfig.valorMatch, greaterThan(0));
    expect(PixConfig.chave, isNotEmpty);
  });
}
