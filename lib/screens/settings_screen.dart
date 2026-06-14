import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../constants/contato_config.dart';
import '../providers/app_state.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';
import '../widgets/foto_perfil_editor.dart';
import 'login_screen.dart';
import 'profile_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final p = app.profile;

    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: const Text(
                'Configurações',
                style: TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  if (p != null)
                    CopaCard(
                      child: Column(
                        children: [
                          const FotoPerfilEditor(radius: 44),
                          const SizedBox(height: 12),
                          Text(p.nome, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                          const SizedBox(height: 4),
                          Text('${p.cidade} - ${p.estado}'),
                          Text(p.email),
                          const SizedBox(height: 8),
                          Text('Raio de troca: ${p.raioTrocaKm.toInt()} km'),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),
                  CopaMenuTopico(
                    titulo: 'FOTO DE PERFIL',
                    cor: CopaColors.azul,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProfileScreen()),
                    ),
                  ),
                  const SizedBox(height: 12),
                  CopaMenuTopico(
                    titulo: 'VER PERFIL COMPLETO',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProfileScreen()),
                    ),
                  ),
                  const SizedBox(height: 12),
                  CopaCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'FALE CONOSCO',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          ContatoConfig.nome,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                        ),
                        const SizedBox(height: 4),
                        SelectableText(
                          ContatoConfig.email,
                          style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () => _copiarEmail(context),
                            icon: const Icon(Icons.email_outlined),
                            label: const Text('COPIAR E-MAIL'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  CopaMenuTopico(
                    titulo: 'SAIR DA CONTA',
                    cor: CopaColors.vermelho,
                    onTap: () async {
                      await app.sair();
                      if (context.mounted) {
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                          (_) => false,
                        );
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _copiarEmail(BuildContext context) async {
    await Clipboard.setData(const ClipboardData(text: ContatoConfig.email));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('E-mail ${ContatoConfig.nome} copiado!')),
      );
    }
  }
}
