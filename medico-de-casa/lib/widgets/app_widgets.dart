import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: loading ? null : onPressed,
      child: loading
          ? const SizedBox(
              height: 22,
              width: 22,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            )
          : Text(label),
    );
  }
}

class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.title,
    required this.child,
    this.actions,
    this.floatingActionButton,
  });

  final String title;
  final Widget child;
  final List<Widget>? actions;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title), actions: actions),
      floatingActionButton: floatingActionButton,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: child,
        ),
      ),
    );
  }
}

class CaregiverCard extends StatelessWidget {
  const CaregiverCard({
    super.key,
    required this.name,
    required this.rating,
    required this.reviewCount,
    required this.specialties,
    this.dailyRate,
    this.city,
    required this.onTap,
  });

  final String name;
  final double rating;
  final int reviewCount;
  final List<String> specialties;
  final double? dailyRate;
  final String? city;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                child: const Icon(Icons.person, color: AppColors.primary, size: 32),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star, color: AppColors.accent, size: 18),
                        const SizedBox(width: 4),
                        Text('${rating.toStringAsFixed(1)} ($reviewCount)'),
                      ],
                    ),
                    if (city != null) ...[
                      const SizedBox(height: 4),
                      Text(city!, style: const TextStyle(color: AppColors.textSecondary)),
                    ],
                    if (specialties.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: specialties.take(3).map((s) => Chip(
                          label: Text(s, style: const TextStyle(fontSize: 12)),
                          visualDensity: VisualDensity.compact,
                          backgroundColor: AppColors.backgroundSoft,
                        )).toList(),
                      ),
                    ],
                  ],
                ),
              ),
              if (dailyRate != null)
                Text(
                  'R\$ ${dailyRate!.toStringAsFixed(0)}/dia',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
