import 'dart:typed_data';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../theme/copa_theme.dart';
import '../utils/foto_picker_util.dart';
import '../widgets/aviso_listener.dart';
import '../widgets/copa_widgets.dart';
import 'home_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, this.completarCadastro = false});

  /// Usuário já autenticado, falta concluir dados no Firestore.
  final bool completarCadastro;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nome = TextEditingController();
  final _email = TextEditingController();
  final _senha = TextEditingController();
  final _repetirSenha = TextEditingController();
  final _telefone = TextEditingController();
  final _endereco = TextEditingController();
  final _cidade = TextEditingController();
  final _estado = TextEditingController(text: 'MG');

  Uint8List? _fotoBytes;
  String? _fotoNome;

  @override
  void initState() {
    super.initState();
    final p = context.read<AppState>().profile;
    if (p != null) {
      _nome.text = p.nome;
      _email.text = p.email;
      _telefone.text = p.telefone;
      _endereco.text = p.endereco;
      _cidade.text = p.cidade;
      _estado.text = p.estado;
    } else {
      final authEmail = FirebaseAuth.instance.currentUser?.email;
      if (authEmail != null) _email.text = authEmail;
    }
  }

  @override
  void dispose() {
    _nome.dispose();
    _email.dispose();
    _senha.dispose();
    _repetirSenha.dispose();
    _telefone.dispose();
    _endereco.dispose();
    _cidade.dispose();
    _estado.dispose();
    super.dispose();
  }

  Future<void> _escolherFoto() async {
    try {
      final selecionada = await escolherFotoPerfil();
      if (selecionada == null || !mounted) return;
      setState(() {
        _fotoBytes = selecionada.bytes;
        _fotoNome = selecionada.nome;
      });
    } catch (e) {
      if (mounted) {
        _mostrarAviso('Erro ao selecionar foto: $e', erro: true);
      }
    }
  }

  void _mostrarAviso(String msg, {bool erro = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: erro ? CopaColors.vermelho : CopaColors.verde,
      ),
    );
  }

  Future<void> _salvarFotoPerfil() async {
    if (_fotoBytes == null) return;
    final ok = await context.read<AppState>().atualizarFoto(
          fotoBytes: _fotoBytes!,
          fotoNome: _fotoNome ?? 'foto.jpg',
        );
    if (!mounted) return;
    if (ok) {
      _mostrarAviso('Foto salva no Firebase!');
    } else {
      _mostrarAviso(context.read<AppState>().erro ?? 'Erro ao salvar foto.', erro: true);
    }
  }

  Future<void> _cadastrar() async {
    if (_nome.text.trim().isEmpty ||
        _email.text.trim().isEmpty ||
        _telefone.text.trim().isEmpty ||
        _endereco.text.trim().isEmpty ||
        _cidade.text.trim().isEmpty ||
        _estado.text.trim().isEmpty) {
      _mostrarAviso('Preencha nome, e-mail, telefone, endereço, cidade e estado.', erro: true);
      return;
    }

    if (!widget.completarCadastro) {
      if (_senha.text.length < 6) {
        _mostrarAviso('A senha deve ter no mínimo 6 caracteres.', erro: true);
        return;
      }
      if (_senha.text != _repetirSenha.text) {
        _mostrarAviso('As senhas não coincidem. Repita a senha corretamente.', erro: true);
        return;
      }
    }

    context.read<AppState>().limparMensagens();
    final app = context.read<AppState>();
    final ok = widget.completarCadastro
        ? await app.completarCadastro(
            nome: _nome.text,
            telefone: _telefone.text,
            endereco: _endereco.text,
            cidade: _cidade.text,
            estado: _estado.text,
            fotoBytes: _fotoBytes,
            fotoNome: _fotoNome,
          )
        : await app.cadastrar(
            nome: _nome.text,
            email: _email.text,
            senha: _senha.text,
            telefone: _telefone.text,
            endereco: _endereco.text,
            cidade: _cidade.text,
            estado: _estado.text,
            fotoBytes: _fotoBytes,
            fotoNome: _fotoNome,
          );

    if (ok && mounted) {
      final msg = _fotoBytes != null && app.profile?.fotoUrl == null
          ? 'Cadastro concluído, mas a foto não foi salva. Altere em Configurações → Perfil.'
          : 'Cadastro concluído com sucesso!';
      _mostrarAviso(msg, erro: _fotoBytes != null && app.profile?.fotoUrl == null);
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const AvisoListener(child: HomeScreen())),
        (_) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final titulo = widget.completarCadastro ? 'Complete seu cadastro' : 'Cadastro';
    final botao = widget.completarCadastro ? 'CONCLUIR CADASTRO' : 'CRIAR CONTA';

    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              automaticallyImplyLeading: !widget.completarCadastro,
              title: Text(
                titulo,
                style: const TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: CopaCard(
                  child: Column(
                    children: [
                      if (widget.completarCadastro)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: CopaColors.amarelo.withValues(alpha: 0.35),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'Seu login existe, mas o cadastro ainda não está completo. '
                            'Preencha os dados abaixo para entrar no app.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                        ),
                      GestureDetector(
                        onTap: _escolherFoto,
                        child: CircleAvatar(
                          radius: 52,
                          backgroundColor: CopaColors.azul.withValues(alpha: 0.15),
                          backgroundImage:
                              _fotoBytes != null ? MemoryImage(_fotoBytes!) : null,
                          child: _fotoBytes == null
                              ? const Icon(Icons.add_a_photo, size: 36, color: CopaColors.azul)
                              : null,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _fotoBytes == null
                            ? 'Escolha uma foto para o perfil'
                            : 'Prévia selecionada — salve ou conclua o cadastro',
                        style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                      if (_fotoBytes != null) ...[
                        const SizedBox(height: 8),
                        if (widget.completarCadastro)
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(backgroundColor: CopaColors.verde),
                              onPressed: app.carregando ? null : _salvarFotoPerfil,
                              icon: const Icon(Icons.cloud_upload),
                              label: const Text('SALVAR FOTO NO FIREBASE'),
                            ),
                          )
                        else
                          Text(
                            'A foto será enviada ao Firebase ao criar a conta.',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                            textAlign: TextAlign.center,
                          ),
                        TextButton(
                          onPressed: () => setState(() {
                            _fotoBytes = null;
                            _fotoNome = null;
                          }),
                          child: const Text('REMOVER PRÉVIA'),
                        ),
                      ] else ...[
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _escolherFoto,
                            icon: const Icon(Icons.photo_library_outlined),
                            label: const Text('ESCOLHER FOTO'),
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      _campo(_nome, 'Nome completo', Icons.person),
                      const SizedBox(height: 12),
                      _campo(
                        _email,
                        'E-mail',
                        Icons.email,
                        readOnly: widget.completarCadastro,
                      ),
                      if (!widget.completarCadastro) ...[
                        const SizedBox(height: 12),
                        _campo(_senha, 'Senha (mín. 6)', Icons.lock, obscure: true),
                        const SizedBox(height: 12),
                        _campo(_repetirSenha, 'Repetir senha', Icons.lock_outline, obscure: true),
                      ],
                      const SizedBox(height: 12),
                      _campo(_telefone, 'Telefone', Icons.phone),
                      const SizedBox(height: 12),
                      _campo(_endereco, 'Endereço (rua, nº, bairro)', Icons.home),
                      const SizedBox(height: 12),
                      _campo(_cidade, 'Cidade', Icons.location_city),
                      const SizedBox(height: 12),
                      _campo(_estado, 'Estado (UF)', Icons.map),
                      const SizedBox(height: 8),
                      Text(
                        'Usamos sua localização (GPS) junto com o endereço para calcular a distância dos matches.',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                        textAlign: TextAlign.center,
                      ),
                      if (app.erro != null) ...[
                        const SizedBox(height: 12),
                        Text(app.erro!, style: const TextStyle(color: Colors.red)),
                      ],
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: app.carregando ? null : _cadastrar,
                          child: app.carregando
                              ? const SizedBox(
                                  height: 22,
                                  width: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Text(botao),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _campo(
    TextEditingController c,
    String label,
    IconData icon, {
    bool obscure = false,
    bool readOnly = false,
  }) {
    return TextField(
      controller: c,
      obscureText: obscure,
      readOnly: readOnly,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: CopaColors.azul),
      ),
    );
  }
}
