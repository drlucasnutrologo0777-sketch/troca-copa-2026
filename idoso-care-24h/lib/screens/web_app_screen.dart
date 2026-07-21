import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../services/ic24_iap_service.dart';
import '../services/web_app_bundle.dart';

/// Protótipo web completo (mesmo conteúdo do serve_web.py / TestFlight build 37+).
class WebAppScreen extends StatefulWidget {
  const WebAppScreen({super.key});

  @override
  State<WebAppScreen> createState() => _WebAppScreenState();
}

class _WebAppScreenState extends State<WebAppScreen> {
  Directory? _root;
  String? _error;
  bool _webReady = false;
  bool _pageLoaded = false;
  String? _status;

  @override
  void initState() {
    super.initState();
    Ic24IapService.instance.init();
    _prepare();
  }

  @override
  void dispose() {
    Ic24IapService.instance.dispose();
    super.dispose();
  }

  Future<void> _prepare() async {
    try {
      final root = await WebAppBundle.ensureOnDisk();
      final index = File('${root.path}/index.html');
      if (!await index.exists()) {
        throw StateError('index.html ausente em ${root.path}');
      }
      if (!mounted) return;
      setState(() {
        _root = root;
        _status = 'Abrindo Idoso Care 24H…';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _loadWeb(InAppWebViewController controller) async {
    final root = _root;
    if (root == null) return;

    final indexPath = '${root.path}/index.html';
    final readAccess = WebUri('file://${root.path}/');

    if (Platform.isIOS || Platform.isMacOS) {
      await controller.loadUrl(
        urlRequest: URLRequest(url: WebUri('file://$indexPath')),
        allowingReadAccessTo: readAccess,
      );
      return;
    }

    final server = InAppLocalhostServer(documentRoot: root.path);
    await server.start();
    await controller.loadUrl(
      urlRequest: URLRequest(
        url: WebUri('http://127.0.0.1:${server.port}/index.html'),
      ),
    );
  }

  void _registerNativeBridge(InAppWebViewController controller) {
    controller.addJavaScriptHandler(
      handlerName: 'ic24PurchasePlatformFee',
      callback: (args) async {
        try {
          final caregiverId = args.isNotEmpty ? args[0]?.toString() : null;
          return await Ic24IapService.instance.comprarTaxaManutencao(
            caregiverId: caregiverId,
          );
        } catch (e) {
          return {'ok': false, 'error': e.toString()};
        }
      },
    );

    controller.addJavaScriptHandler(
      handlerName: 'ic24PlatformFeeProductInfo',
      callback: (args) async {
        await Ic24IapService.instance.init();
        final svc = Ic24IapService.instance;
        return {
          'available': svc.suportado && svc.lojaDisponivel && svc.product != null,
          'productId': svc.product?.id ?? 'ic24_taxa_manutencao',
          'price': svc.precoExibicao,
        };
      },
    );
  }

  Future<void> _injectNativeFlags(InAppWebViewController controller) async {
    await controller.evaluateJavascript(source: '''
      window._ic24NativeIap = ${Platform.isIOS};
    ''');
  }

  Future<void> _verifyContent(InAppWebViewController controller) async {
    await _injectNativeFlags(controller);
    final ok = await controller.evaluateJavascript(source: '''
      (function(){
        var w=document.getElementById('welcome');
        var btn=document.querySelector('#welcome .btn-p');
        return !!(w && btn && w.classList.contains('on'));
      })();
    ''');
    if (!mounted) return;
    if (ok == true) {
      setState(() {
        _webReady = true;
        _status = null;
      });
      return;
    }
    setState(() {
      _status = 'Página incompleta. Verifique conexão (Firebase/CDN).';
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return _frame(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Não foi possível abrir o app web.\n\n$_error',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, height: 1.45),
          ),
        ),
      );
    }

    if (_root == null) {
      return _frame(
        child: const Center(
          child: CircularProgressIndicator(color: Color(0xFF2E8B57)),
        ),
      );
    }

    final readAccess = WebUri('file://${_root!.path}/');

    return _frame(
      child: Stack(
        fit: StackFit.expand,
        children: [
          InAppWebView(
            onWebViewCreated: (controller) async {
              _registerNativeBridge(controller);
              await _loadWeb(controller);
            },
            initialSettings: InAppWebViewSettings(
              javaScriptEnabled: true,
              domStorageEnabled: true,
              databaseEnabled: true,
              mediaPlaybackRequiresUserGesture: false,
              allowsInlineMediaPlayback: true,
              allowFileAccessFromFileURLs: true,
              allowUniversalAccessFromFileURLs: true,
              allowingReadAccessTo: readAccess,
              supportZoom: false,
              transparentBackground: false,
              underPageBackgroundColor: const Color(0xFFF5F7FA),
              isInspectable: true,
            ),
            onLoadStop: (controller, url) async {
              if (mounted) setState(() => _pageLoaded = true);
              await _verifyContent(controller);
            },
            onReceivedError: (controller, request, error) {
              if (!mounted || request.isForMainFrame != true) return;
              setState(() => _status = error.description);
            },
            onConsoleMessage: (controller, msg) {
              if (msg.messageLevel == ConsoleMessageLevel.ERROR && mounted) {
                setState(() => _status = msg.message);
              }
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
          if (!_webReady && _status != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 24,
              child: Material(
                color: const Color(0xFF2E8B57),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    _status!,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          if (!_pageLoaded)
            IgnorePointer(
              child: Container(
                color: const Color(0xFFF5F7FA),
                alignment: Alignment.center,
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: Color(0xFF2E8B57)),
                    SizedBox(height: 16),
                    Text('Carregando…', style: TextStyle(fontSize: 15)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _frame({required Widget child}) {
    return ColoredBox(
      color: const Color(0xFFF5F7FA),
      child: SafeArea(child: child),
    );
  }
}
