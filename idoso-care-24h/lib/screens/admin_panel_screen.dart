import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/firestore_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_widgets.dart';

class AdminPanelScreen extends StatelessWidget {
  const AdminPanelScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final fs = context.read<FirestoreService>();
    final demo = Firebase.apps.isEmpty;

    return AppScaffold(
      title: 'Aprovação de Cuidadores',
      child: StreamBuilder(
        stream: demo ? fs.pendingCaregiversDemo() : fs.pendingCaregivers(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          if (demo) {
            final list = snapshot.data ?? [];
            if (list.isEmpty) return const Center(child: Text('Nenhum cuidador pendente.'));
            return ListView.builder(
              itemCount: list.length,
              itemBuilder: (context, index) {
                final data = list[index];
                final uid = data['uid'] as String;
                return _card(context, uid, data);
              },
            );
          }

          final docs = snapshot.data ?? [];
          if (docs.isEmpty) return const Center(child: Text('Nenhum cuidador pendente.'));
          return ListView.builder(
            itemCount: docs.length,
            itemBuilder: (context, index) {
              final doc = docs[index];
              return _card(context, doc.id, doc.data());
            },
          );
        },
      ),
    );
  }

  Widget _card(BuildContext context, String uid, Map<String, dynamic> data) {
    final name = data['fullName'] as String? ?? uid;
    final city = data['city'] as String? ?? '';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
            if (city.isNotEmpty) Text(city, style: const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => context.read<FirestoreService>().approveCaregiver(uid, false),
                    child: const Text('Reprovar'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => context.read<FirestoreService>().approveCaregiver(uid, true),
                    child: const Text('Aprovar'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
