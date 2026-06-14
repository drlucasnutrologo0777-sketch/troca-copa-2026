import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

/// Escolhe imagem da galeria/arquivos — web usa file_picker (image_picker falha na web).
Future<({Uint8List bytes, String nome})?> escolherFotoPerfil() async {
  if (kIsWeb) {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.image,
      allowMultiple: false,
      withData: true,
    );
    if (result == null || result.files.isEmpty) return null;
    final arquivo = result.files.single;
    final bytes = arquivo.bytes;
    if (bytes == null || bytes.isEmpty) return null;
    return (
      bytes: bytes,
      nome: arquivo.name.isNotEmpty ? arquivo.name : 'foto.jpg',
    );
  }

  final picker = ImagePicker();
  final file = await picker.pickImage(
    source: ImageSource.gallery,
    maxWidth: 800,
    imageQuality: 85,
  );
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  return (
    bytes: bytes,
    nome: file.name.isNotEmpty ? file.name : 'foto.jpg',
  );
}
