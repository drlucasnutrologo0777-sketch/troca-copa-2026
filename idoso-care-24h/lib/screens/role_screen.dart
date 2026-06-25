import 'package:flutter/material.dart';

import '../models/user_profile.dart';
import '../theme/app_theme.dart';
import '../widgets/app_widgets.dart';
import 'login_screen.dart';

class RoleScreen extends StatefulWidget {
  const RoleScreen({super.key, this.selectedRole});

  final UserRole? selectedRole;

  @override
  State<RoleScreen> createState() => _RoleScreenState();
}

class _RoleScreenState extends State<RoleScreen> {
  UserRole? _role;

  @override
  void initState() {
    super.initState();
    _role = widget.selectedRole;
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Escolha seu perfil',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Como você vai usar o Idoso Care 24H?',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 20),
          _RoleCard(
            title: 'Sou Cuidador',
            subtitle: 'Ofereço plantões e cuidados profissionais',
            icon: Icons.medical_services_outlined,
            selected: _role == UserRole.caregiver,
            onTap: () => setState(() => _role = UserRole.caregiver),
          ),
          const SizedBox(height: 12),
          _RoleCard(
            title: 'Preciso de Cuidador',
            subtitle: 'Busco cuidadores para um familiar idoso',
            icon: Icons.family_restroom,
            selected: _role == UserRole.family,
            onTap: () => setState(() => _role = UserRole.family),
          ),
          const Spacer(),
          PrimaryButton(
            label: 'Continuar',
            onPressed: _role == null
                ? null
                : () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => LoginScreen(role: _role!, isSignUp: true),
                      ),
                    ),
          ),
        ],
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? AppColors.primary : const Color(0xFFE0E0E0),
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: selected ? AppColors.primary : AppColors.textSecondary, size: 32),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(subtitle, style: const TextStyle(color: AppColors.textSecondary)),
                ],
              ),
            ),
            if (selected) const Icon(Icons.check_circle, color: AppColors.primary),
          ],
        ),
      ),
    );
  }
}
