import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_widgets.dart';
import 'chat_screen.dart';

class CaregiverProfileScreen extends StatefulWidget {
  const CaregiverProfileScreen({super.key, required this.caregiverId});

  final String caregiverId;

  @override
  State<CaregiverProfileScreen> createState() => _CaregiverProfileScreenState();
}

class _CaregiverProfileScreenState extends State<CaregiverProfileScreen> {
  bool _loading = false;

  Future<void> _requestContact() async {
    final familyId = context.read<AuthService>().currentUid;
    if (familyId == null) return;
    setState(() => _loading = true);
    try {
      final chatId = await context.read<FirestoreService>().requestContact(
            caregiverId: widget.caregiverId,
            familyId: familyId,
          );
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ChatScreen(chatId: chatId)),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: context.read<FirestoreService>().getCaregiver(widget.caregiverId),
      builder: (context, snapshot) {
        final c = snapshot.data;
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const AppScaffold(title: 'Perfil', child: Center(child: CircularProgressIndicator()));
        }
        if (c == null) {
          return const AppScaffold(title: 'Perfil', child: Center(child: Text('Cuidador não encontrado')));
        }
        return AppScaffold(
          title: c.fullName,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: CircleAvatar(
                  radius: 48,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                  child: const Icon(Icons.person, size: 48, color: AppColors.primary),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.star, color: AppColors.accent),
                  const SizedBox(width: 4),
                  Text('${c.rating.toStringAsFixed(1)} (${c.reviewCount} avaliações)'),
                ],
              ),
              if (c.city != null) ...[
                const SizedBox(height: 8),
                Text(c.city!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
              ],
              const SizedBox(height: 20),
              if (c.bio != null && c.bio!.isNotEmpty) Text(c.bio!),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: c.specialties.map((s) => Chip(label: Text(s))).toList(),
              ),
              const Spacer(),
              if (c.dailyRate != null)
                Text(
                  'A partir de R\$ ${c.dailyRate!.toStringAsFixed(0)}/dia',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.primary),
                ),
              const SizedBox(height: 16),
              PrimaryButton(
                label: 'Solicitar contato',
                onPressed: _requestContact,
                loading: _loading,
              ),
            ],
          ),
        );
      },
    );
  }
}
