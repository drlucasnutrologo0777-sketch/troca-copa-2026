import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';

class PastTradesScreen extends StatelessWidget {
  const PastTradesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;

    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              title: const Text(
                'Trocas Anteriores',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            Expanded(
              child: uid == null
                  ? const Center(child: Text('Faça login para ver suas trocas.'))
                  : StreamBuilder<QuerySnapshot>(
                      stream: FirebaseFirestore.instance
                          .collection('users')
                          .doc(uid)
                          .collection('unlockedMatches')
                          .orderBy('unlockedAt', descending: true)
                          .snapshots(),
                      builder: (context, snap) {
                        if (snap.connectionState == ConnectionState.waiting) {
                          return const Center(
                            child: CircularProgressIndicator(color: CopaColors.amarelo),
                          );
                        }
                        final docs = snap.data?.docs ?? [];
                        if (docs.isEmpty) {
                          return Center(
                            child: CopaCard(
                              child: Text(
                                'Nenhuma troca desbloqueada ainda.\nUse MATCH para encontrar colecionadores.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey.shade700),
                              ),
                            ),
                          );
                        }
                        return ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: docs.length,
                          itemBuilder: (_, i) {
                            final d = docs[i].data() as Map<String, dynamic>;
                            final quando = d['unlockedAt'];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: CopaCard(
                                child: Row(
                                  children: [
                                    const Icon(Icons.swap_horiz, color: CopaColors.verde),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            d['otherUserName'] as String? ?? 'Colecionador',
                                            style: const TextStyle(fontWeight: FontWeight.w900),
                                          ),
                                          if (d['euDou'] != null)
                                            Text(
                                              'Deu: ${(d['euDou'] as List).join(', ')}',
                                              style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                                            ),
                                          if (d['euRecebo'] != null)
                                            Text(
                                              'Recebeu: ${(d['euRecebo'] as List).join(', ')}',
                                              style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                                            ),
                                          if (d['valorIap'] != null || d['valorPix'] != null)
                                            Text(
                                              'Compra in-app R\$ ${((d['valorIap'] ?? d['valorPix']) as num).toStringAsFixed(2)}',
                                              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                                            ),
                                          if (quando != null)
                                            Text(
                                              'Desbloqueado',
                                              style: TextStyle(
                                                color: Colors.grey.shade600,
                                                fontSize: 12,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
