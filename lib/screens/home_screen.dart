import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_name.dart';
import '../providers/app_state.dart';
import '../services/aviso_service.dart';
import '../services/presence_service.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';
import 'chat_screen.dart';
import 'match_screen.dart';
import 'my_offers_screen.dart';
import 'past_trades_screen.dart';
import 'settings_screen.dart';
import 'trade_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  bool _dialogMostrado = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _perguntarOnline());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final app = context.read<AppState>();
    if (state == AppLifecycleState.paused || state == AppLifecycleState.detached) {
      app.ficarOffline();
    } else if (state == AppLifecycleState.resumed && app.online) {
      AvisoService.instance.reset();
      app.ficarOnline();
    }
  }

  Future<void> _perguntarOnline() async {
    if (_dialogMostrado || !mounted) return;
    final app = context.read<AppState>();
    if (app.online) return;
    _dialogMostrado = true;

    final ok = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Ficar online para trocar?'),
        content: const Text(
          'Ative sua localização e fique ONLINE para outros colecionadores saberem que você está disponível para troca.\n\nA distância da figurinha é calculada pelo GPS.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('FICAR OFFLINE'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('FICAR ONLINE'),
          ),
        ],
      ),
    );

    if (!mounted) return;
    if (ok == true) {
      final ativou = await app.ficarOnline();
      if (!ativou && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(app.erro ?? 'Não foi possível ativar.')),
        );
      }
    }
  }

  Future<void> _confirmarApagarConta() async {
    final senhaController = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Apagar conta?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Esta ação é permanente. Digite sua senha para confirmar.'),
            const SizedBox(height: 12),
            TextField(
              controller: senhaController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Senha',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCELAR')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('APAGAR', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final senha = senhaController.text.trim();
    if (senha.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Digite sua senha para confirmar.')),
      );
      return;
    }
    final app = context.read<AppState>();
    final removido = await app.apagarConta(senha: senha);
    if (!mounted) return;
    if (removido) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Conta apagada. Até logo!')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(app.erro ?? 'Não foi possível apagar a conta.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final p = app.profile;

    return CopaAlbumBackground(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Column(
                children: [
                  Text(
                    AppName.titulo,
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  CopaCard(
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              PresenceService.indicadorOnline(app.online, size: 12),
                              const SizedBox(height: 4),
                              Text(
                                app.online
                                    ? 'Você está visível para trocas'
                                    : 'Você está offline — ative para receber match',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: app.online,
                          onChanged: (v) async {
                            if (v) {
                              final ok = await app.ficarOnline();
                              if (!ok && context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(app.erro ?? 'Erro ao ficar online')),
                                );
                              }
                            } else {
                              await app.ficarOffline();
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (p != null)
                    CopaCard(
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: CopaColors.azul.withValues(alpha: 0.15),
                            backgroundImage: p.fotoUrl != null && p.fotoUrl!.isNotEmpty
                                ? NetworkImage('${p.fotoUrl}?v=${p.fotoUrl.hashCode}')
                                : null,
                            child: p.fotoUrl == null || p.fotoUrl!.isEmpty
                                ? Text(
                                    p.nome.isNotEmpty ? p.nome[0].toUpperCase() : '?',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      color: CopaColors.azul,
                                      fontSize: 22,
                                    ),
                                  )
                                : null,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(p.nome, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                                Text(
                                  '${p.cidade} - ${p.estado}',
                                  style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                children: [
                  CopaMenuTopico(
                    titulo: 'TROCAR FIGURINHA',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const TradeScreen()),
                    ),
                  ),
                  CopaMenuTopico(
                    titulo: 'MINHAS OFERTAS',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const MyOffersScreen()),
                    ),
                  ),
                  CopaMenuTopico(
                    titulo: 'MATCH',
                    cor: CopaColors.primary,
                    destaque: true,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const MatchScreen()),
                    ),
                  ),
                  CopaMenuTopico(
                    titulo: 'TROCAS ANTERIORES',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const PastTradesScreen()),
                    ),
                  ),
                  CopaMenuTopico(
                    titulo: 'CHAT',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ChatScreen()),
                    ),
                  ),
                  CopaMenuTopico(
                    titulo: 'CONFIGURAÇÕES',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SettingsScreen()),
                    ),
                  ),
                  CopaMenuTopico(
                    titulo: 'APAGAR CONTA',
                    cor: CopaColors.vermelho,
                    onTap: _confirmarApagarConta,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
