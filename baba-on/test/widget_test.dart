import 'package:flutter_test/flutter_test.dart';
import 'package:baba_on_app/main.dart';

void main() {
  testWidgets('App inicia sem crash', (WidgetTester tester) async {
    await tester.pumpWidget(const BabaOnApp());
    await tester.pump();
    expect(find.textContaining('Babá ON'), findsWidgets);
  });
}
