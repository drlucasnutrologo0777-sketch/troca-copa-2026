import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_widgets.dart';
import 'caregiver_profile_screen.dart';

/// Tela principal do cuidador — status, dados cadastrados e orientações do app.
class CaregiverStatusScreen extends StatelessWidget {
  const CaregiverStatusScreen({super.key});

  static bool _isApproved(dynamic value) {
    if (value == true) return true;
    if (value is String && value.toLowerCase() == 'true') return true;
    return false;
  }

  static String _formatMoney(num? value) {
    if (value == null) return '—';
    return 'R\$ ${value.toStringAsFixed(0)}';
  }

  static List<String> _specialties(Map<String, dynamic>? data) {
    final raw = data?['specialties'];
    if (raw is List) return raw.map((e) => e.toString()).where((s) => s.isNotEmpty).toList();
    return const [];
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final uid = auth.currentUid;
    if (uid == null) {
      return const AppScaffold(title: 'Início', child: SizedBox.shrink());
    }

    return AppScaffold(
      title: 'Início',
      child: StreamBuilder(
        stream: context.read<FirestoreService>().caregiverDataStream(uid),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final data = snapshot.data;
          final approved = _isApproved(data?['approved']);
          final profile = auth.profile;
          final name = data?['fullName'] as String? ?? profile?.fullName ?? 'Cuidador';
          final email = data?['email'] as String? ?? profile?.email ?? '—';
          final phone = data?['phone'] as String? ?? profile?.phone ?? '—';
          final city = data?['city'] as String? ?? '';
          final state = data?['state'] as String? ?? '';
          final fullAddress = data?['fullAddress'] as String? ?? '';
          final bio = data?['bio'] as String? ?? '';
          final specialties = _specialties(data);
          final dailyRate = (data?['dailyRate'] as num?)?.toDouble();
          final hourRate = (data?['hourRate'] as num?)?.toDouble();
          final rating = (data?['rating'] as num?)?.toDouble() ?? 0;
          final reviewCount = data?['reviewCount'] as int? ?? 0;

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _StatusBanner(approved: approved),
                const SizedBox(height: 20),
                _SectionCard(
                  title: 'Seus dados cadastrados',
                  icon: Icons.person_outline,
                  children: [
                    _InfoRow(label: 'Nome', value: name),
                    _InfoRow(label: 'E-mail', value: email),
                    _InfoRow(label: 'Telefone', value: phone.isEmpty ? '—' : phone),
                    _InfoRow(
                      label: 'Cidade / UF',
                      value: [city, state].where((s) => s.isNotEmpty).join(' — ').isEmpty
                          ? '—'
                          : [city, state].where((s) => s.isNotEmpty).join(' — '),
                    ),
                    if (fullAddress.isNotEmpty) _InfoRow(label: 'Endereço', value: fullAddress),
                    _InfoRow(label: 'Sobre você', value: bio.isEmpty ? '—' : bio),
                    _InfoRow(
                      label: 'Especialidades',
                      value: specialties.isEmpty ? '—' : specialties.join(', '),
                    ),
                    _InfoRow(label: 'Valor diária', value: _formatMoney(dailyRate)),
                    _InfoRow(label: 'Valor hora', value: _formatMoney(hourRate)),
                    _InfoRow(
                      label: 'Avaliações',
                      value: reviewCount == 0
                          ? 'Ainda sem avaliações'
                          : '${rating.toStringAsFixed(1)} ★ ($reviewCount)',
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _SectionCard(
                  title: 'Situação do cadastro',
                  icon: Icons.assignment_outlined,
                  children: [
                    _InfoRow(
                      label: 'Status',
                      value: approved ? 'Aprovado e visível para famílias' : 'Em análise pela equipe',
                    ),
                    _InfoRow(
                      label: 'Visibilidade',
                      value: approved
                          ? 'Seu perfil aparece na busca de famílias'
                          : 'Oculto até a aprovação',
                    ),
                    if (!approved)
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: Text(
                          'A equipe Idoso Care analisa documentos e dados em até 48 horas úteis. '
                          'Você recebe acesso completo assim que for aprovado.',
                          style: TextStyle(color: AppColors.textSecondary, height: 1.45),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                _SectionCard(
                  title: 'Como funciona o app',
                  icon: Icons.info_outline,
                  children: const [
                    _StepRow(
                      number: '1',
                      text: 'Você completa o cadastro como cuidador (endereço, bio, valores).',
                    ),
                    SizedBox(height: 10),
                    _StepRow(
                      number: '2',
                      text: 'A equipe aprova seu perfil. Depois disso, famílias podem encontrá-lo.',
                    ),
                    SizedBox(height: 10),
                    _StepRow(
                      number: '3',
                      text: 'Famílias buscam cuidadores na aba Buscar e abrem seu perfil.',
                    ),
                    SizedBox(height: 10),
                    _StepRow(
                      number: '4',
                      text: 'Quando uma família tocar em Solicitar contato, a conversa abre na aba Chat.',
                    ),
                    SizedBox(height: 10),
                    _StepRow(
                      number: '5',
                      text: 'Na aba Perfil você vê sua conta e pode sair do app.',
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _SectionCard(
                  title: approved ? 'O que fazer agora' : 'Enquanto aguarda',
                  icon: Icons.checklist_outlined,
                  children: [
                    if (approved) ...[
                      const Text(
                        'Seu cadastro está ativo. Famílias já podem solicitar contato. '
                        'Não é necessário ficar nesta tela — use as abas abaixo quando precisar.',
                        style: TextStyle(color: AppColors.textSecondary, height: 1.45),
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CaregiverProfileScreen(
                              caregiverId: uid,
                              viewAsSelf: true,
                            ),
                          ),
                        ),
                        child: const Text('Ver preview do meu perfil público'),
                      ),
                      const SizedBox(height: 12),
                      _NavHint(icon: Icons.chat_bubble_outline, label: 'Chat', hint: 'mensagens das famílias'),
                      const SizedBox(height: 8),
                      _NavHint(icon: Icons.person, label: 'Perfil', hint: 'dados da conta e sair'),
                    ] else ...[
                      const Text(
                        '• Mantenha documentos e dados atualizados.\n'
                        '• Aguarde a aprovação — você será notificado quando o status mudar aqui.\n'
                        '• Depois de aprovado, famílias poderão encontrá-lo e iniciar conversa pelo Chat.',
                        style: TextStyle(color: AppColors.textSecondary, height: 1.55),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 8),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({required this.approved});

  final bool approved;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: approved
            ? AppColors.primary.withValues(alpha: 0.1)
            : AppColors.accent.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
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
                const SizedBox(height: 6),
                Text(
                  approved
                      ? 'Famílias já podem encontrar você na plataforma Idoso Care 24H.'
                      : 'Análise em até 48 horas úteis. Você acompanha o status nesta tela.',
                  style: const TextStyle(color: AppColors.textSecondary, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.children,
  });

  final String title;
  final IconData icon;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.primary, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 15, height: 1.35)),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({required this.number, required this.text});

  final String number;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 26,
          height: 26,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: Text(
            number,
            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(text, style: const TextStyle(color: AppColors.textSecondary, height: 1.4)),
        ),
      ],
    );
  }
}

class _NavHint extends StatelessWidget {
  const _NavHint({required this.icon, required this.label, required this.hint});

  final IconData icon;
  final String label;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 8),
        Text.rich(
          TextSpan(
            text: 'Aba ',
            style: const TextStyle(color: AppColors.textSecondary),
            children: [
              TextSpan(text: label, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              TextSpan(text: ' — $hint'),
            ],
          ),
        ),
      ],
    );
  }
}
