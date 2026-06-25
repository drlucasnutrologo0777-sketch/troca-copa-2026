import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_widgets.dart';

class CaregiverStatusScreen extends StatelessWidget {
  const CaregiverStatusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final uid = context.watch<AuthService>().currentUid;
    if (uid == null) {
      return const AppScaffold(title: 'Meu cadastro', child: SizedBox.shrink());
    }

    return AppScaffold(
      title: 'Meu cadastro',
      child: StreamBuilder(
        stream: context.read<FirestoreService>().caregiverDataStream(uid),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final data = snapshot.data;
          final approved = data?['approved'] as bool? ?? false;
          final city = data?['city'] as String? ?? '';
          final fullAddress = data?['fullAddress'] as String? ?? '';
          final name = data?['fullName'] as String? ?? context.read<AuthService>().profile?.fullName ?? '';

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: approved
                      ? AppColors.primary.withValues(alpha: 0.1)
                      : AppColors.accent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Icon(
                      approved ? Icons.verified : Icons.hourglass_top,
                      color: approved ? AppColors.primary : AppColors.accent,
                      size: 36,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            approved ? 'Perfil aprovado' : 'Aguardando aprovação',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            approved
                                ? 'Famílias já podem encontrar seu perfil.'
                                : 'Nossa equipe analisa seu cadastro em até 48 horas.',
                            style: const TextStyle(color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
              if (fullAddress.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text('Endereço', style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(fullAddress, style: const TextStyle(color: AppColors.textSecondary, height: 1.4)),
              ] else if (city.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(city, style: const TextStyle(color: AppColors.textSecondary)),
              ],
              const SizedBox(height: 24),
              const Text(
                'Enquanto aguarda, mantenha seus documentos atualizados. '
                'Quando aprovado, famílias poderão solicitar contato pelo app.',
                style: TextStyle(color: AppColors.textSecondary, height: 1.4),
              ),
            ],
          );
        },
      ),
    );
  }
}
