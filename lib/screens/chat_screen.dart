import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/pix_config.dart';
import '../models/models.dart';
import '../services/mutual_match_service.dart';
import '../services/presence_service.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';
import 'chat_room_screen.dart';

class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: const Text(
                'Chat',
                style: TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900),
              ),
            ),
            Expanded(
              child: StreamBuilder<List<ActiveChat>>(
                stream: MutualMatchService.instance.chatsLiberados(),
                builder: (context, snap) {
                  if (snap.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator(color: CopaColors.amarelo));
                  }
                  final chats = snap.data ?? [];
                  if (chats.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: CopaCard(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.lock_outline, size: 48, color: Colors.grey.shade600),
                              const SizedBox(height: 12),
                              const Text('Chat bloqueado', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                              const SizedBox(height: 8),
                              Text(
                                'Libera após aceite mútuo + PIX R\$ ${PixConfig.valorMatch.toStringAsFixed(2)} dos dois lados.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey.shade700),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: chats.length,
                    itemBuilder: (_, i) => _chatCard(context, chats[i]),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chatCard(BuildContext context, ActiveChat c) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: CopaCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(c.otherUserName, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
            StreamBuilder<bool>(
              stream: PresenceService.instance.observarOnline(c.otherUserId),
              builder: (context, snap) => PresenceService.indicadorOnline(snap.data ?? false),
            ),
            Text('Tel: ${c.otherUserTelefone}'),
            const SizedBox(height: 8),
            const Text('Conversa em tempo real após pagamento duplo.', style: TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: c.otherUserTelefone));
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Telefone copiado!')),
                        );
                      }
                    },
                    icon: const Icon(Icons.phone),
                    label: const Text('COPIAR TEL'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ChatRoomScreen(mutualMatchId: c.matchId),
                      ),
                    ),
                    icon: const Icon(Icons.chat),
                    label: const Text('ABRIR CHAT'),
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
