import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'screens/web_app_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Firebase nativo: rode flutterfire configure --project=medico-de-casa
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Color(0xFFEDE7F6),
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const MedicoHomeApp());
}

class MedicoHomeApp extends StatelessWidget {
  const MedicoHomeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Medico de Casa',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF502D96)),
        useMaterial3: true,
      ),
      home: const WebAppScreen(),
    );
  }
}
