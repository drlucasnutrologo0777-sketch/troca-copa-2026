import 'package:flutter/material.dart';

import '../constants/app_branding.dart';
import '../theme/copa_theme.dart';

class DisclaimerBanner extends StatelessWidget {
  const DisclaimerBanner({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: compact ? 8 : 10),
      decoration: BoxDecoration(
        color: CopaColors.branco.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: CopaColors.primario.withValues(alpha: 0.35)),
      ),
      child: Text(
        AppBranding.disclaimer,
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: compact ? 11 : 12,
          fontWeight: FontWeight.w600,
          color: Colors.grey.shade800,
          height: 1.3,
        ),
      ),
    );
  }
}
