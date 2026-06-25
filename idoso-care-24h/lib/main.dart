import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'firebase_options.dart';
import 'screens/onboarding_gate.dart';
import 'screens/welcome_screen.dart';
import 'services/auth_service.dart';
import 'services/firestore_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _initFirebase();
  runApp(const IdosoCareApp());
}

Future<void> _initFirebase() async {
  if (!DefaultFirebaseOptions.configured) return;
  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  } catch (_) {
    // Permite abrir telas de UI localmente; configure Firebase antes do build de loja.
  }
}

class IdosoCareApp extends StatelessWidget {
  const IdosoCareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        Provider(create: (_) => FirestoreService()),
      ],
      child: MaterialApp(
        title: 'Idoso Care 24H',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        home: const SplashGate(),
        routes: {
          '/home': (_) => const OnboardingGate(),
        },
      ),
    );
  }
}
