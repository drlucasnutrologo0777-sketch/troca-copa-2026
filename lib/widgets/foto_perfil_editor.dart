import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../theme/copa_theme.dart';
import '../utils/foto_picker_util.dart';

/// Escolhe foto, mostra prévia e salva no Firebase Storage + Firestore.
class FotoPerfilEditor extends StatefulWidget {
  const FotoPerfilEditor({
    super.key,
    this.radius = 48,
    this.mostrarBotaoEscolher = true,
    this.salvarAutomatico = false,
    this.onFotoSalva,
  });

  final double radius;
  final bool mostrarBotaoEscolher;
  /// Se true, envia ao Firebase assim que escolher (cadastro rápido).
  final bool salvarAutomatico;
  final VoidCallback? onFotoSalva;

  @override
  State<FotoPerfilEditor> createState() => _FotoPerfilEditorState();
}

class _FotoPerfilEditorState extends State<FotoPerfilEditor> {
  Uint8List? _previewLocal;
  String? _previewNome;
  bool _enviando = false;

  Future<void> _escolherFoto() async {
    if (_enviando) return;
    try {
      final selecionada = await escolherFotoPerfil();
      if (selecionada == null || !mounted) return;

      setState(() {
        _previewLocal = selecionada.bytes;
        _previewNome = selecionada.nome;
      });

      if (widget.salvarAutomatico) {
        await _salvarFoto();
      }
    } catch (e) {
      if (mounted) {
        _aviso('Não foi possível selecionar a foto: $e', erro: true);
      }
    }
  }

  Future<void> _salvarFoto() async {
    if (_previewLocal == null || _enviando) return;

    setState(() => _enviando = true);
    try {
      final ok = await context.read<AppState>().atualizarFoto(
            fotoBytes: _previewLocal!,
            fotoNome: _previewNome ?? 'foto.jpg',
          );

      if (!mounted) return;
      if (ok) {
        setState(() {
          _previewLocal = null;
          _previewNome = null;
        });
        _aviso('Foto salva no Firebase com sucesso!');
        widget.onFotoSalva?.call();
      } else {
        final erro = context.read<AppState>().erro;
        _aviso(erro ?? 'Erro ao salvar foto no Firebase.', erro: true);
      }
    } catch (e) {
      if (mounted) {
        _aviso('Falha ao enviar foto: $e', erro: true);
      }
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  void _cancelarPreview() {
    setState(() {
      _previewLocal = null;
      _previewNome = null;
    });
  }

  void _aviso(String msg, {bool erro = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: erro ? CopaColors.vermelho : CopaColors.verde,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.watch<AppState>().profile;
    final nome = p?.nome ?? '';
    final fotoUrl = p?.fotoUrl;
    final temPreview = _previewLocal != null;

    ImageProvider? imagem;
    if (_previewLocal != null) {
      imagem = MemoryImage(_previewLocal!);
    } else if (fotoUrl != null && fotoUrl.isNotEmpty) {
      imagem = NetworkImage('$fotoUrl?v=${fotoUrl.hashCode}');
    }

    return Column(
      children: [
        Stack(
          alignment: Alignment.bottomRight,
          children: [
            CircleAvatar(
              radius: widget.radius,
              backgroundColor: CopaColors.azul.withValues(alpha: 0.2),
              backgroundImage: imagem,
              child: imagem == null
                  ? Text(
                      nome.isNotEmpty ? nome[0].toUpperCase() : '?',
                      style: TextStyle(
                        fontSize: widget.radius * 0.65,
                        fontWeight: FontWeight.w900,
                        color: CopaColors.azul,
                      ),
                    )
                  : null,
            ),
            if (_enviando)
              Positioned.fill(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.black45,
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(strokeWidth: 2, color: CopaColors.branco),
                    ),
                  ),
                ),
              )
            else
              CircleAvatar(
                radius: 18,
                backgroundColor: CopaColors.amarelo,
                child: const Icon(Icons.camera_alt, size: 18, color: CopaColors.textoEscuro),
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (temPreview)
          Text(
            'Prévia da foto — confirme para salvar no perfil',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
            textAlign: TextAlign.center,
          )
        else if (fotoUrl != null && fotoUrl.isNotEmpty)
          const Text(
            'Foto salva no Firebase',
            style: TextStyle(fontSize: 12, color: CopaColors.verde, fontWeight: FontWeight.w600),
          )
        else
          Text(
            'Nenhuma foto no perfil ainda',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
        const SizedBox(height: 12),
        if (widget.mostrarBotaoEscolher)
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _enviando ? null : _escolherFoto,
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text('ESCOLHER FOTO'),
            ),
          ),
        if (temPreview && !widget.salvarAutomatico) ...[
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: CopaColors.verde),
              onPressed: _enviando ? null : _salvarFoto,
              icon: _enviando
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.cloud_upload),
              label: Text(_enviando ? 'SALVANDO...' : 'SALVAR FOTO NO FIREBASE'),
            ),
          ),
          const SizedBox(height: 6),
          TextButton(
            onPressed: _enviando ? null : _cancelarPreview,
            child: const Text('CANCELAR'),
          ),
        ],
      ],
    );
  }
}
