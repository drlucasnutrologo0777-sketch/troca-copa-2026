import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'providers/app_state.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'services/auth_service.dart';
import 'services/iap_service.dart';
import 'services/sticker_catalog_service.dart';
import 'theme/copa_theme.dart';
import 'widgets/aviso_listener.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await StickerCatalogService.instance.load();
  await IapService.instance.init();
  runApp(const TrocaCopaApp());
}

class TrocaCopaApp extends StatelessWidget {
  const TrocaCopaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState()..init(),
      child: MaterialApp(
        title: 'TROCA COPA 2026',
        debugShowCheckedModeBanner: false,
        theme: buildCopaTheme(),
        home: const _RootGate(),
      ),
    );
  }
}

class _RootGate extends StatefulWidget {
  const _RootGate();

  @override
  State<_RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<_RootGate> {
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: AuthService.instance.authState,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (!snap.hasData) {
          return const LoginScreen();
        }

        return Consumer<AppState>(
          builder: (context, app, _) {
            if (app.profile == null) {
              return _PerfilLoader(onReady: () => setState(() {}));
            }
            if (!app.profile!.cadastroCompleto) {
              return const RegisterScreen(completarCadastro: true);
            }
            return const AvisoListener(child: HomeScreen());
          },
        );
      },
    );
  }
}

class _PerfilLoader extends StatefulWidget {
  const _PerfilLoader({required this.onReady});

  final VoidCallback onReady;

  @override
  State<_PerfilLoader> createState() => _PerfilLoaderState();
}

class _PerfilLoaderState extends State<_PerfilLoader> {
  bool _carregando = true;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar() async {
    await context.read<AppState>().init();
    if (mounted) {
      setState(() => _carregando = false);
      widget.onReady();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_carregando) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final app = context.watch<AppState>();
    if (app.profile == null) {
      return const RegisterScreen(completarCadastro: true);
    }
    if (!app.profile!.cadastroCompleto) {
      return const RegisterScreen(completarCadastro: true);
    }
    return const AvisoListener(child: HomeScreen());
  }
}
