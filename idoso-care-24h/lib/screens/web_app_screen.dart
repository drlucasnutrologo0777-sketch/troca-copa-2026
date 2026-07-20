import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../services/web_app_bundle.dart';

/// Protótipo web completo (mesmo conteúdo do serve_web.py / TestFlight build 57+).
class WebAppScreen extends StatefulWidget {
  const WebAppScreen({super.key});

  static const buildLabel = 'Build 58 · Web App';

  @override
  State<WebAppScreen> createState() => _WebAppScreenState();
}

class _WebAppScreenState extends State<WebAppScreen> {
  InAppLocalhostServer? _server;
  WebUri? _initialUrl;
  String? _error;
  bool _webLoaded = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    try {
      final root = await WebAppBundle.ensureOnDisk();
      final index = '${root.path}/index.html';
      InAppLocalhostServer? server;
      WebUri? url;

      try {
        server = InAppLocalhostServer(documentRoot: root.path, port: 8080);
        await server.start();
        url = WebUri('http://127.0.0.1:${server.port}/index.html?v=58');
      } catch (_) {
        server?.close();
        server = InAppLocalhostServer(documentRoot: root.path, port: 0);
        await server.start();
        url = WebUri('http://127.0.0.1:${server.port}/index.html?v=58');
      }

      if (!server.isRunning()) {
        url = WebUri.uri(Uri.file(index));
      }

      _server = server;
      if (!mounted) return;
      setState(() => _initialUrl = url);
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
      return _shell(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'App web não carregou.\n\n$_error\n\n'
            'Se vir barra inferior Cadastro/Chat/Perfil ou título '
            '"Cadastro Cuidador (1/3)", você instalou o app Flutter ANTIGO '
            '(repo idoso-care-24h). Apague o app e instale o build 56 do repo troca-copa-2026.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, height: 1.45),
          ),
        ),
      );
    }

    if (_initialUrl == null) {
      return _shell(
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: Color(0xFF2E8B57)),
            SizedBox(height: 16),
            Text('Carregando protótipo web…', style: TextStyle(fontSize: 15)),
          ],
        ),
      );
    }

    return _shell(
      child: Stack(
        fit: StackFit.expand,
        children: [
          InAppWebView(
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
              isInspectable: true,
            ),
            onLoadStop: (controller, url) {
              if (!mounted) return;
              setState(() {
                _webLoaded = true;
                _loadError = null;
              });
            },
            onReceivedError: (controller, request, error) {
              if (!mounted || request.isForMainFrame != true) return;
              setState(() => _loadError = error.description);
            },
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
          if (!_webLoaded)
            Container(
              color: const Color(0xFFF5F7FA),
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(color: Color(0xFF2E8B57)),
                  const SizedBox(height: 16),
                  Text(
                    _loadError ?? 'Abrindo ${WebAppScreen.buildLabel}…',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 14, height: 1.4),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _shell({required Widget child}) {
    return ColoredBox(
      color: const Color(0xFFF5F7FA),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              color: const Color(0xFF2E8B57),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Text(
                WebAppScreen.buildLabel,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  letterSpacing: 0.3,
                ),
              ),
            ),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}
