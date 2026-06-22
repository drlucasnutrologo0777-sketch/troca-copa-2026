import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_name.dart';
import '../providers/app_state.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';
import 'home_screen.dart';
import 'register_screen.dart';
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
        const SnackBar(content: Text('Login realizado com sucesso!')),
      );
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const AvisoListener(child: HomeScreen())),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Complete seu cadastro para continuar.')),
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
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 32, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              AppName.titulo,
              style: Theme.of(context).textTheme.headlineLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              AppName.disclaimer,
              style: const TextStyle(color: CopaColors.textoSuave, fontSize: 12, height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: _irCadastro,
              icon: const Icon(Icons.person_add_alt_1_outlined),
              label: const Text('Criar conta'),
              style: OutlinedButton.styleFrom(
                foregroundColor: CopaColors.primary,
                side: const BorderSide(color: CopaColors.primary),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 20),
            CopaCard(
              child: Column(
                children: [
                  TabBar(
                    controller: _tabs,
                    indicatorColor: CopaColors.primary,
                    labelColor: CopaColors.primary,
                    unselectedLabelColor: CopaColors.textoSuave,
                    labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    tabs: const [
                      Tab(text: 'Login'),
                      Tab(text: 'Cadastro'),
                      Tab(text: 'Esqueci'),
                    ],
                  ),
                  SizedBox(
                    height: 360,
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
            ),
          ],
        ),
      ),
    );
  }

  Widget _abaLogin(AppState app) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 16, 4, 0),
      child: Column(
        children: [
          _campo(_emailLogin, 'E-mail', Icons.email_outlined, obscure: false),
          const SizedBox(height: 12),
          _campo(_senhaLogin, 'Senha', Icons.lock_outline, obscure: true),
          if (app.erro != null && _tabs.index == 0) ...[
            const SizedBox(height: 12),
            Text(app.erro!, style: const TextStyle(color: CopaColors.vermelho)),
          ],
          const Spacer(),
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
                  : const Text('Entrar'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _abaCadastro() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.how_to_reg_outlined, size: 48, color: CopaColors.textoSuave),
          const SizedBox(height: 12),
          const Text(
            'Cadastro completo',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18),
          ),
          const SizedBox(height: 8),
          const Text(
            'Nome e e-mail obrigatórios. Demais campos opcionais.',
            textAlign: TextAlign.center,
            style: TextStyle(color: CopaColors.textoSuave),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _irCadastro,
              child: const Text('Abrir formulário'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _abaEsqueci(AppState app) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 16, 4, 0),
      child: Column(
        children: [
          const Text(
            'Informe seu e-mail para receber o link de recuperação.',
            textAlign: TextAlign.center,
            style: TextStyle(color: CopaColors.textoSuave),
          ),
          const SizedBox(height: 16),
          _campo(_emailReset, 'E-mail', Icons.email_outlined, obscure: false),
          if (app.erro != null && _tabs.index == 2) ...[
            const SizedBox(height: 12),
            Text(app.erro!, style: const TextStyle(color: CopaColors.vermelho)),
          ],
          if (app.sucesso != null && _tabs.index == 2) ...[
            const SizedBox(height: 12),
            Text(app.sucesso!, style: const TextStyle(color: CopaColors.primary, fontWeight: FontWeight.w600)),
          ],
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: app.carregando ? null : () async {
                context.read<AppState>().limparMensagens();
                await app.esqueciSenha(_emailReset.text);
              },
              child: const Text('Enviar e-mail'),
            ),
          ),
        ],
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
        prefixIcon: Icon(icon, color: CopaColors.textoSuave),
      ),
    );
  }
}
