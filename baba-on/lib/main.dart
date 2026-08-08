import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'screens/web_app_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // iPad Review: app disponível no iPad precisa girar — não travar só portrait
  await SystemChrome.setPreferredOrientations(DeviceOrientation.values);
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Color(0xFFEEF6FD),
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const BabaOnApp());
}

class BabaOnApp extends StatelessWidget {
  const BabaOnApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Babá ON',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF134175)),
        useMaterial3: true,
      ),
      home: const WebAppScreen(),
    );
  }
}
