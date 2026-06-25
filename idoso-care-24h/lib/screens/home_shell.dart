import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/user_profile.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_widgets.dart';
import 'admin_panel_screen.dart';
import 'caregiver_list_screen.dart';
import 'caregiver_status_screen.dart';
import 'chat_list_screen.dart';
import 'welcome_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final role = auth.profile?.role ?? UserRole.family;
    final isAdmin = role == UserRole.admin;
    final isCaregiver = role == UserRole.caregiver;

    final tabs = <Widget>[
      if (isCaregiver) const CaregiverStatusScreen() else const CaregiverListScreen(),
      const ChatListScreen(),
      if (isAdmin) const AdminPanelScreen(),
      _ProfileTab(role: role),
    ];

    final destinations = <NavigationDestination>[
      NavigationDestination(
        icon: Icon(isCaregiver ? Icons.badge_outlined : Icons.search),
        label: isCaregiver ? 'Cadastro' : 'Buscar',
      ),
      const NavigationDestination(icon: Icon(Icons.chat_bubble_outline), label: 'Chat'),
      if (isAdmin)
        const NavigationDestination(icon: Icon(Icons.admin_panel_settings), label: 'Admin'),
      const NavigationDestination(icon: Icon(Icons.person), label: 'Perfil'),
    ];

    final safeIndex = _index.clamp(0, tabs.length - 1);

    return Scaffold(
      body: IndexedStack(index: safeIndex, children: tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: safeIndex,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: destinations,
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab({required this.role});

  final UserRole role;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final profile = auth.profile;
    return AppScaffold(
      title: 'Meu perfil',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(profile?.fullName ?? 'Usuário', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(profile?.email ?? '', style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 8),
          Text(
            role == UserRole.caregiver
                ? 'Perfil: Cuidador'
                : role == UserRole.admin
                    ? 'Perfil: Administrador'
                    : 'Perfil: Família',
            style: const TextStyle(color: AppColors.primary),
          ),
          const Spacer(),
          OutlinedButton(
            onPressed: () async {
              await auth.signOut();
              if (!context.mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const WelcomeScreen()),
                (_) => false,
              );
            },
            child: const Text('Sair'),
          ),
        ],
      ),
    );
  }
}
