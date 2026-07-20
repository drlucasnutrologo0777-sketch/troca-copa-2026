import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_widgets.dart';
import 'chat_screen.dart';

class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final uid = auth.currentUid;
    if (uid == null) {
      return const AppScaffold(
        title: 'Conversas',
        child: Center(child: Text('Faça login para ver suas conversas.')),
      );
    }

    final fs = context.read<FirestoreService>();
    final demo = Firebase.apps.isEmpty;

    return AppScaffold(
      title: 'Conversas',
      child: StreamBuilder(
        stream: demo ? fs.userChatsDemo(uid) : fs.userChats(uid),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          if (demo) {
            final chats = snapshot.data ?? [];
            if (chats.isEmpty) {
              return _empty();
            }
            return ListView.separated(
              itemCount: chats.length,
              separatorBuilder: (_, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final chat = chats[index];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                    child: const Icon(Icons.chat_bubble_outline, color: AppColors.primary),
                  ),
                  title: Text(
                    chat['lastMessage'] as String? ?? 'Nova conversa',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => ChatScreen(chatId: chat['id'] as String)),
                  ),
                );
              },
            );
          }

          final docs = snapshot.data ?? [];
          if (docs.isEmpty) return _empty();

          return ListView.separated(
            itemCount: docs.length,
            separatorBuilder: (_, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final doc = docs[index];
              final data = doc.data();
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                  child: const Icon(Icons.chat_bubble_outline, color: AppColors.primary),
                ),
                title: Text(
                  data['lastMessage'] as String? ?? 'Nova conversa',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => ChatScreen(chatId: doc.id)),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _empty() {
    return const Center(
      child: Text(
        'Nenhuma conversa ainda.\nSolicite contato com um cuidador para iniciar.',
        textAlign: TextAlign.center,
        style: TextStyle(color: AppColors.textSecondary),
      ),
    );
  }
}
