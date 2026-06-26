import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../services/web_app_bundle.dart';

/// Protótipo web completo (mesmo conteúdo do serve_web.py / TestFlight build 35+).
class WebAppScreen extends StatefulWidget {
  const WebAppScreen({super.key});

  @override
  State<WebAppScreen> createState() => _WebAppScreenState();
}

class _WebAppScreenState extends State<WebAppScreen> {
  InAppLocalhostServer? _server;
  WebUri? _initialUrl;
  String? _error;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    try {
      final root = await WebAppBundle.ensureOnDisk();
      final server = InAppLocalhostServer(documentRoot: root.path);
      await server.start();
      _server = server;
      if (!mounted) return;
      setState(() {
        _initialUrl = WebUri('http://127.0.0.1:${server.port}/index.html');
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  void dispose() {
    _server?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF5F7FA),
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'App web não carregou.\n\n$_error\n\n'
                'Se vir Buscar/Chat/Perfil, o TestFlight instalou build antigo (Flutter). '
                'Apague o app e instale o build 35.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, height: 1.45),
              ),
            ),
          ),
        ),
      );
    }

    if (_initialUrl == null) {
      return const ColoredBox(
        color: Color(0xFFF5F7FA),
        child: Center(child: CircularProgressIndicator(color: Color(0xFF2E8B57))),
      );
    }

    return ColoredBox(
      color: const Color(0xFFF5F7FA),
      child: InAppWebView(
        initialUrlRequest: URLRequest(url: _initialUrl),
        initialSettings: InAppWebViewSettings(
          javaScriptEnabled: true,
          domStorageEnabled: true,
          databaseEnabled: true,
          mediaPlaybackRequiresUserGesture: false,
          allowsInlineMediaPlayback: true,
          allowFileAccessFromFileURLs: true,
          allowUniversalAccessFromFileURLs: true,
          supportZoom: false,
          transparentBackground: true,
          underPageBackgroundColor: const Color(0xFFF5F7FA),
        ),
        onPermissionRequest: (controller, request) async {
          return PermissionResponse(
            resources: request.resources,
            action: PermissionResponseAction.GRANT,
          );
        },
        onGeolocationPermissionsShowPrompt: (controller, origin) async {
          return GeolocationPermissionShowPromptResponse(
            origin: origin,
            allow: true,
            retain: true,
          );
        },
      ),
    );
  }
}
