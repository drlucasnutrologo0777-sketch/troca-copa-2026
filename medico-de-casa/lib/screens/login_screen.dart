import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/user_profile.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_widgets.dart';
import 'onboarding_gate.dart';
import 'role_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.role, this.isSignUp = false});

  final UserRole? role;
  final bool isSignUp;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  bool _loading = false;
  String? _error;

  bool get _signUp => widget.isSignUp && widget.role != null;

  String _authErrorMessage(Object e, bool signUp) {
    if (e is StateError) return e.message;
    if (e is FirebaseAuthException) {
      switch (e.code) {
        case 'email-already-in-use':
          return 'E-mail já cadastrado — use Entrar';
        case 'invalid-email':
          return 'E-mail inválido';
        case 'weak-password':
          return 'Senha fraca — use pelo menos 6 caracteres';
        case 'user-not-found':
        case 'wrong-password':
        case 'invalid-credential':
          return 'E-mail ou senha inválidos';
        default:
          return e.message ?? (signUp ? 'Não foi possível criar a conta' : 'Falha no login');
      }
    }
    return signUp ? 'Não foi possível criar a conta. Tente outro e-mail.' : 'E-mail ou senha inválidos';
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_email.text.trim().isEmpty || _password.text.length < 6) {
      setState(() => _error = 'E-mail válido e senha com mínimo 6 caracteres');
      return;
    }
    if (_signUp && _name.text.trim().isEmpty) {
      setState(() => _error = 'Informe seu nome completo');
      return;
    }

    if (_signUp && _password.text != _confirmPassword.text) {
      setState(() => _error = 'As senhas não coincidem');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final auth = context.read<AuthService>();
      if (_signUp) {
        await auth.signUp(
          email: _email.text,
          password: _password.text,
          fullName: _name.text,
          role: widget.role!,
          phone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        );
      } else {
        await auth.signIn(_email.text, _password.text);
      }
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const OnboardingGate()),
        (_) => false,
      );
    } catch (e) {
      setState(() {
        _error = _authErrorMessage(e, _signUp);
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(_signUp ? 'Criar conta' : 'Entrar'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 32),
              Container(
                width: 72,
                height: 72,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.favorite, color: Colors.white, size: 36),
              ),
              Text(
                _signUp ? 'Criar conta' : 'Entrar',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
              const SizedBox(height: 8),
              Text(
                _signUp
                    ? widget.role == UserRole.caregiver
                        ? 'Cadastro de cuidador profissional'
                        : 'Cadastro de família / responsável'
                    : 'Cuidadores de idosos com segurança e confiança',
                style: const TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 32),
              if (auth.useDemoMode)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Modo demonstração: conta salva neste aparelho. '
                    'Configure Firebase para produção.',
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.35),
                  ),
                ),
              if (_signUp) ...[
                TextField(
                  controller: _name,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(labelText: 'Nome completo'),
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(labelText: 'E-mail'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                obscureText: true,
                autofillHints: _signUp ? const [AutofillHints.newPassword] : const [AutofillHints.password],
                decoration: InputDecoration(
                  labelText: _signUp ? 'Criar senha (mín. 6)' : 'Senha',
                ),
              ),
              if (_signUp) ...[
                const SizedBox(height: 12),
                TextField(
                  controller: _confirmPassword,
                  obscureText: true,
                  autofillHints: const [AutofillHints.newPassword],
                  decoration: const InputDecoration(labelText: 'Repetir senha'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Telefone (opcional)'),
                ),
              ],
              if (!_signUp)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Recuperação de senha por e-mail em breve')),
                      );
                    },
                    child: const Text('Esqueceu a senha?'),
                  ),
                ),
              if (_error != null) ...[
                Text(_error!, style: const TextStyle(color: AppColors.error)),
                const SizedBox(height: 8),
              ],
              PrimaryButton(
                label: _signUp ? 'Criar conta' : 'Entrar',
                onPressed: _submit,
                loading: _loading,
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _signUp ? 'Já tem conta? ' : 'Não tem conta? ',
                    style: const TextStyle(color: AppColors.textSecondary),
                  ),
                  GestureDetector(
                    onTap: () {
                      if (_signUp) {
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                        );
                      } else {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const RoleScreen()),
                        );
                      }
                    },
                    child: Text(
                      _signUp ? 'Entrar' : 'Cadastre-se',
                      style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
