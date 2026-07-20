import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// Extrai [web_app/] do bundle Flutter para disco — WebView iOS precisa de arquivos reais.
class WebAppBundle {
  static const _assetPrefix = 'web_app/';
  static const _stampName = '.bundle_stamp';
  static const bundleStamp = 'web_v58';

  static Future<Directory> ensureOnDisk() async {
    final support = await getApplicationSupportDirectory();
    final root = Directory(p.join(support.path, 'web_app_runtime'));
    final stamp = File(p.join(root.path, _stampName));

    if (await stamp.exists()) {
      final cached = (await stamp.readAsString()).trim();
      final index = File(p.join(root.path, 'index.html'));
      if (cached == bundleStamp && await index.exists()) {
        return root;
      }
    }

    if (await root.exists()) {
      await root.delete(recursive: true);
    }
    await root.create(recursive: true);

    final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
    final keys = manifest.listAssets().where((k) => k.startsWith(_assetPrefix)).toList();
    if (keys.isEmpty) {
      throw StateError(
        'Nenhum asset web_app/ no IPA. Verifique pubspec.yaml e o workflow Codemagic (repo troca-copa-2026).',
      );
    }

    for (final key in keys) {
      final relative = key.substring(_assetPrefix.length);
      if (relative.isEmpty) continue;
      final bytes = (await rootBundle.load(key)).buffer.asUint8List();
      final out = File(p.join(root.path, relative));
      await out.parent.create(recursive: true);
      await out.writeAsBytes(bytes, flush: true);
    }

    if (!await File(p.join(root.path, 'index.html')).exists()) {
      throw StateError('web_app/index.html ausente após extrair assets.');
    }

    await stamp.writeAsString(bundleStamp);
    return root;
  }
}
