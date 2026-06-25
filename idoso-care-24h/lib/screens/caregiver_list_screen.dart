import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/firestore_service.dart';
import '../widgets/app_widgets.dart';
import 'caregiver_profile_screen.dart';

class CaregiverListScreen extends StatelessWidget {
  const CaregiverListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Cuidadores',
      child: StreamBuilder(
        stream: context.read<FirestoreService>().approvedCaregivers(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final list = snapshot.data ?? [];
          if (list.isEmpty) {
            return const Center(
              child: Text(
                'Nenhum cuidador aprovado ainda.\nCadastre-se como cuidador ou aguarde aprovação.',
                textAlign: TextAlign.center,
              ),
            );
          }
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, index) {
              final c = list[index];
              return CaregiverCard(
                name: c.fullName,
                rating: c.rating,
                reviewCount: c.reviewCount,
                specialties: c.specialties,
                dailyRate: c.dailyRate,
                city: c.city,
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => CaregiverProfileScreen(caregiverId: c.uid),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
