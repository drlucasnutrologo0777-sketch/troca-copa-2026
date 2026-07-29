import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../theme/app_theme.dart';
import '../widgets/app_widgets.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key, required this.profileData});

  final Map<String, dynamic> profileData;

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  final _picker = ImagePicker();
  final Map<String, bool> _uploaded = {};

  static const _docs = [
    ('rg', 'RG — Registro Geral', 'Frente e verso'),
    ('cpf', 'CPF', 'Documento ou cartão'),
    ('comprovante', 'Comprovante de endereço', 'Até 90 dias'),
    ('ctps', 'Carteira de Trabalho', 'Identificação e contrato'),
    ('diploma', 'Diploma / Certificado', 'Formação profissional'),
    ('antecedentes', 'Antecedentes criminais', 'Últimos 90 dias'),
    ('curso', 'Curso de Cuidador de Idosos', 'Certificado'),
    ('inss', 'INSS / PIS', 'Cartão ou extrato'),
    ('titulo', 'Título de eleitor', 'Opcional'),
    ('reservista', 'Certificado reservista', 'Se aplicável'),
    ('referencia', 'Comprovante de experiência', 'Referência profissional'),
  ];

  Future<void> _pick(String key) async {
    final file = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (file == null) {
      final gallery = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
      if (gallery == null) return;
    }
    setState(() => _uploaded[key] = true);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Documento anexado — enviar ao Firebase Storage')),
    );
  }

  void _submit() {
    final obrigatorios = ['rg', 'cpf', 'comprovante', 'ctps', 'antecedentes'];
    final ok = obrigatorios.every((k) => _uploaded[k] == true);
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Anexe RG, CPF, comprovante, CTPS e antecedentes')),
      );
      return;
    }
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cadastro enviado'),
        content: const Text('Documentos em análise. Resposta em até 48 horas.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst), child: const Text('OK')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documentos')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text('Etapa 2 de 2', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 12)),
          const LinearProgressIndicator(value: 1, color: AppColors.primary),
          const SizedBox(height: 16),
          const Text('Anexar documentos', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text(
            'Fotos legíveis de cada documento. Exigência de agências de cuidadores.',
            style: TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          ..._docs.map((d) {
            final done = _uploaded[d.$1] == true;
            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: done ? AppColors.primary : AppColors.backgroundSoft,
                  child: Icon(done ? Icons.check : Icons.upload_file, color: done ? Colors.white : AppColors.textSecondary),
                ),
                title: Text(d.$2, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(d.$3),
                trailing: done ? const Icon(Icons.check_circle, color: AppColors.primary) : const Icon(Icons.camera_alt),
                onTap: () => _pick(d.$1),
              ),
            );
          }),
          const SizedBox(height: 16),
          PrimaryButton(label: 'Enviar cadastro para análise', onPressed: _submit),
        ],
      ),
    );
  }
}
