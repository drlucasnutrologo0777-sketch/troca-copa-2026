import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';
import '../widgets/foto_perfil_editor.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final p = app.profile;

    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              title: const Text(
                'Perfil',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    if (p != null) ...[
                      const FotoPerfilEditor(radius: 52),
                      const SizedBox(height: 4),
                      Text(
                        'Escolha a foto e toque em SALVAR FOTO NO FIREBASE',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      CopaCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _linha('Nome', p.nome),
                            _linha('E-mail', p.email),
                            _linha('Telefone', p.telefone),
                            _linha('Endereço', p.endereco),
                            _linha('Cidade', '${p.cidade} - ${p.estado}'),
                            _linha('Figurinhas no anúncio', '${app.ofertaAtual.length}/7'),
                          ],
                        ),
                      ),
                    ],
                    const Spacer(),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: CopaColors.branco,
                          side: const BorderSide(color: CopaColors.branco),
                        ),
                        onPressed: () async {
                          await app.sair();
                          if (context.mounted) {
                            Navigator.of(context).pushAndRemoveUntil(
                              MaterialPageRoute(builder: (_) => const LoginScreen()),
                              (_) => false,
                            );
                          }
                        },
                        child: const Text('SAIR'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _linha(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$k: ', style: const TextStyle(fontWeight: FontWeight.w800)),
            Expanded(child: Text(v)),
          ],
        ),
      );
}
