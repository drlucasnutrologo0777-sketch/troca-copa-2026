import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

/// Carrega o protótipo web completo (mesmo do `python scripts/serve_web.py`).
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
      final server = InAppLocalhostServer(documentRoot: 'web_app');
      await server.start();
      _server = server;
      if (!mounted) return;
      setState(() {
        _initialUrl = WebUri('http://localhost:${server.port}/index.html');
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
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Não foi possível abrir o app.\n\n$_error', textAlign: TextAlign.center),
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

    // Tela cheia: safe-area fica no CSS do web (viewport-fit=cover + env(safe-area-inset-*)).
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
