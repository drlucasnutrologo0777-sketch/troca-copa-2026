import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/user_profile.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_widgets.dart';
import 'login_screen.dart';
import 'onboarding_gate.dart';
import 'role_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(Icons.favorite, size: 64, color: AppColors.primary),
              ),
              const SizedBox(height: 24),
              Text(
                'Idoso Care 24H',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Conectamos famílias a cuidadores de idosos verificados, com segurança e transparência.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 16, height: 1.4),
              ),
              const Spacer(),
              PrimaryButton(
                label: 'Entrar',
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const LoginScreen(role: UserRole.caregiver, isSignUp: true),
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                ),
                child: const Text('Criar conta — Sou Cuidador'),
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const LoginScreen(role: UserRole.family, isSignUp: true),
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.secondary,
                  side: const BorderSide(color: AppColors.secondary, width: 2),
                  minimumSize: const Size.fromHeight(52),
                ),
                child: const Text('Criar conta — Preciso de Cuidador'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SplashGate extends StatefulWidget {
  const SplashGate({super.key});

  @override
  State<SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<SplashGate> {
  bool _showLoginShortcut = false;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final auth = context.read<AuthService>();

    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) setState(() => _showLoginShortcut = true);
    });

    try {
      await auth.loadProfile().timeout(const Duration(seconds: 8));
    } catch (_) {
      await auth.signOut();
    }

    if (!mounted) return;

    if (auth.isSignedIn && auth.profile != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const OnboardingGate()),
      );
    } else if (auth.isSignedIn && auth.profile == null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const RoleScreen()),
      );
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const WelcomeScreen()),
      );
    }
  }

  void _goLogin() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  void _goWelcome() async {
    await context.read<AuthService>().signOut();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: AppColors.primary),
              const SizedBox(height: 16),
              const Text('Carregando Idoso Care 24H...'),
              if (_showLoginShortcut) ...[
                const SizedBox(height: 24),
                PrimaryButton(label: 'Ir para login', onPressed: _goLogin),
                const SizedBox(height: 8),
                TextButton(onPressed: _goWelcome, child: const Text('Sair e começar de novo')),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
