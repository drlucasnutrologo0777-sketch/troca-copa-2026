import 'package:flutter_test/flutter_test.dart';
import 'package:idoso_care_app/main.dart';

void main() {
  testWidgets('App inicia sem crash', (WidgetTester tester) async {
    await tester.pumpWidget(const IdosoCareApp());
    await tester.pump();
    expect(find.textContaining('Idoso Care'), findsWidgets);
  });
}
