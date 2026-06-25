import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/user_profile.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../theme/app_theme.dart';
import 'caregiver_register_screen.dart';
import 'family_register_screen.dart';
import 'home_shell.dart';
import 'role_screen.dart';
import 'welcome_screen.dart';

/// Após login, direciona para cadastro incompleto ou home.
class OnboardingGate extends StatefulWidget {
  const OnboardingGate({super.key});

  @override
  State<OnboardingGate> createState() => _OnboardingGateState();
}

class _OnboardingGateState extends State<OnboardingGate> {
  @override
  void initState() {
    super.initState();
    _resolve();
  }

  Future<void> _resolve() async {
    final auth = context.read<AuthService>();
    final fs = context.read<FirestoreService>();

    if (!auth.isSignedIn) {
      _go(const WelcomeScreen());
      return;
    }

    await auth.loadProfile();
    if (!mounted) return;

    final profile = auth.profile;
    if (profile == null) {
      _go(const RoleScreen());
      return;
    }

    switch (profile.role) {
      case UserRole.caregiver:
        final hasProfile = await fs.hasCaregiverProfile(profile.uid);
        if (!mounted) return;
        _go(hasProfile ? const HomeShell() : const CaregiverRegisterScreen());
      case UserRole.family:
        final hasProfile = await fs.hasClientProfile(profile.uid);
        if (!mounted) return;
        _go(hasProfile ? const HomeShell() : const FamilyRegisterScreen());
      case UserRole.admin:
        _go(const HomeShell());
    }
  }

  void _go(Widget screen) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => screen),
    );
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppColors.primary),
            SizedBox(height: 16),
            Text('Preparando seu perfil...'),
          ],
        ),
      ),
    );
  }
}
