import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../constants/app_branding.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';
import 'home_screen.dart';
import 'register_screen.dart';
import '../widgets/disclaimer_banner.dart';
import '../widgets/aviso_listener.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  final _emailLogin = TextEditingController();
  final _senhaLogin = TextEditingController();
  final _emailReset = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _tabs.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tabs.dispose();
    _emailLogin.dispose();
    _senhaLogin.dispose();
    _emailReset.dispose();
    super.dispose();
  }

  void _irCadastro() {
    context.read<AppState>().limparMensagens();
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterScreen()));
  }

  void _irParaDestinoPosLogin(AppState app) {
    final completo = app.profile?.cadastroCompleto ?? false;
    if (completo) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Login realizado com sucesso!',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          backgroundColor: CopaColors.verde,
        ),
      );
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const AvisoListener(child: HomeScreen())),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Complete seu cadastro para continuar.',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          backgroundColor: CopaColors.amarelo,
        ),
      );
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const RegisterScreen(completarCadastro: true)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();

    return CopaAlbumBackground(
      child: Column(
        children: [
          const SizedBox(height: 48),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: CopaColors.branco.withValues(alpha: 0.12),
              shape: BoxShape.circle,
              border: Border.all(color: CopaColors.branco.withValues(alpha: 0.35), width: 2),
            ),
            child: const Icon(Icons.swap_horiz_rounded, size: 44, color: CopaColors.branco),
          ),
          const SizedBox(height: 16),
          Text(
            AppBranding.appName,
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(color: CopaColors.branco),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            AppBranding.tagline,
            style: const TextStyle(
              color: CopaColors.textoClaro,
              fontWeight: FontWeight.w700,
              fontSize: 15,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 10),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: DisclaimerBanner(compact: true),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Material(
              color: CopaColors.destaque,
              borderRadius: BorderRadius.circular(16),
              elevation: 8,
              child: InkWell(
                onTap: _irCadastro,
                borderRadius: BorderRadius.circular(16),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  child: Row(
                    children: [
                      Icon(Icons.person_add_alt_1, color: CopaColors.branco, size: 28),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'PRIMEIRA VEZ? CRIE SUA CONTA',
                              style: TextStyle(
                                color: CopaColors.branco,
                                fontWeight: FontWeight.w900,
                                fontSize: 15,
                              ),
                            ),
                            Text(
                              'Nome, e-mail e foto (opcional)',
                              style: TextStyle(color: CopaColors.branco, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.arrow_forward, color: CopaColors.branco),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: CopaColors.branco.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: CopaColors.branco.withValues(alpha: 0.2)),
            ),
            child: TabBar(
              controller: _tabs,
              indicator: BoxDecoration(
                color: _tabs.index == 1 ? CopaColors.secundario : CopaColors.primario,
                borderRadius: BorderRadius.circular(12),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: CopaColors.branco,
              unselectedLabelColor: CopaColors.textoClaro,
              labelStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
              tabs: const [
                Tab(text: 'LOGIN'),
                Tab(text: 'CADASTRO'),
                Tab(text: 'ESQUECI'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _abaLogin(app),
                _abaCadastro(),
                _abaEsqueci(app),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _abaLogin(AppState app) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: CopaCard(
        child: Column(
          children: [
            _campo(_emailLogin, 'E-mail', Icons.email, obscure: false),
            const SizedBox(height: 12),
            _campo(_senhaLogin, 'Senha', Icons.lock, obscure: true),
            if (app.erro != null && _tabs.index == 0) ...[
              const SizedBox(height: 12),
              Text(app.erro!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: app.carregando
                    ? null
                    : () async {
                        context.read<AppState>().limparMensagens();
                        final ok = await app.loginEmail(
                          email: _emailLogin.text,
                          senha: _senhaLogin.text,
                        );
                        if (ok && context.mounted) {
                          _irParaDestinoPosLogin(context.read<AppState>());
                        }
                      },
                child: app.carregando && _tabs.index == 0
                    ? const SizedBox(
                        height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('ENTRAR'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _abaCadastro() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: CopaCard(
        color: CopaColors.branco.withValues(alpha: 0.98),
        child: Column(
          children: [
            const Icon(Icons.how_to_reg, size: 64, color: CopaColors.primario),
            const SizedBox(height: 12),
            const Text(
              'CADASTRO COMPLETO',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: CopaColors.textoEscuro),
            ),
            const SizedBox(height: 8),
            const Text(
              'Nome, e-mail e foto opcional. Telefone e endereço só se quiser compartilhar no match.',
              textAlign: TextAlign.center,
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: CopaColors.primario,
                  foregroundColor: CopaColors.branco,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: _irCadastro,
                child: const Text('ABRIR FORMULÁRIO DE CADASTRO', style: TextStyle(fontWeight: FontWeight.w900)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _abaEsqueci(AppState app) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: CopaCard(
        child: Column(
          children: [
            const Text('Informe seu e-mail para receber o link de recuperação.', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            _campo(_emailReset, 'E-mail', Icons.email, obscure: false),
            if (app.erro != null && _tabs.index == 2) ...[
              const SizedBox(height: 12),
              Text(app.erro!, style: const TextStyle(color: Colors.red)),
            ],
            if (app.sucesso != null && _tabs.index == 2) ...[
              const SizedBox(height: 12),
              Text(app.sucesso!, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w700)),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: app.carregando ? null : () async {
                  context.read<AppState>().limparMensagens();
                  await app.esqueciSenha(_emailReset.text);
                },
                child: const Text('ENVIAR E-MAIL'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _campo(TextEditingController c, String label, IconData icon, {required bool obscure}) {
    return TextField(
      controller: c,
      obscureText: obscure,
      keyboardType: label == 'E-mail' ? TextInputType.emailAddress : TextInputType.text,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: CopaColors.primario),
      ),
    );
  }
}
