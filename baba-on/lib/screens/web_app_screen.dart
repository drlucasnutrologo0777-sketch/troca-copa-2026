import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../services/bo_iap_service.dart';
import '../services/web_app_bundle.dart';

/// Web app embutido (file:// no iOS com allowingReadAccessTo).
class WebAppScreen extends StatefulWidget {
  const WebAppScreen({super.key});

  @override
  State<WebAppScreen> createState() => _WebAppScreenState();
}

class _WebAppScreenState extends State<WebAppScreen> {
  Directory? _root;
  String? _error;
  bool _pageLoaded = false;
  String? _status;

  @override
  void initState() {
    super.initState();
    BoIapService.instance.init();
    _prepare();
  }

  @override
  void dispose() {
    BoIapService.instance.dispose();
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
        _status = null;
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
          return await BoIapService.instance.comprarTaxaManutencao(
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
        await BoIapService.instance.init();
        final svc = BoIapService.instance;
        return {
          'available': svc.suportado && svc.lojaDisponivel && svc.product != null,
          'productId': svc.product?.id ?? 'bo_taxa_manutencao',
          'price': svc.precoExibicao,
        };
      },
    );
  }

  Future<void> _injectNativeFlags(InAppWebViewController controller) async {
    await controller.evaluateJavascript(source: '''
      window._ic24NativeIap = ${Platform.isIOS};
      if (typeof window.ic24BootNav === 'function') { try { window.ic24BootNav(); } catch (_) {} }
    ''');
  }

  Future<void> _onPageFinished(InAppWebViewController controller) async {
    await _injectNativeFlags(controller);
    if (!mounted) return;
    setState(() {
      _pageLoaded = true;
      _status = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return _frame(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Nùo foi possùvel abrir o app web.\n\n$_error',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, height: 1.45),
          ),
        ),
      );
    }

    if (_root == null) {
      return _frame(
        child: const Center(
          child: CircularProgressIndicator(color: Color(0xFF134175)),
        ),
      );
    }

    final readAccess = WebUri('file://${_root!.path}/');

    return _frame(
      child: Stack(
        fit: StackFit.expand,
        children: [
          InAppWebView(
            // CRùTICO iPad/iOS: sem isso o toque no WebView pode nùo chegar ao botùo Entrar
            gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
              Factory<EagerGestureRecognizer>(() => EagerGestureRecognizer()),
            },
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
              // Evita target=_blank substituir o app inteiro no iPad
              javaScriptCanOpenWindowsAutomatically: false,
              supportMultipleWindows: false,
              supportZoom: false,
              transparentBackground: false,
              underPageBackgroundColor: const Color(0xFFF5F7FA),
              isInspectable: true,
              disableHorizontalScroll: false,
              disableVerticalScroll: false,
            ),
            shouldOverrideUrlLoading: (controller, navigationAction) async {
              final url = navigationAction.request.url;
              if (url == null) return NavigationActionPolicy.ALLOW;
              final s = url.toString();
              // Mantùm navegaùùo local do app; links externos https abrem na mesma WebView sù se for nosso hosting
              if (s.startsWith('file:') || s.startsWith('http://127.0.0.1')) {
                return NavigationActionPolicy.ALLOW;
              }
              if (s.contains('baba-on') && (s.contains('termos') || s.contains('privacidade') || s.contains('exclusao'))) {
                return NavigationActionPolicy.ALLOW;
              }
              if (navigationAction.isForMainFrame == true &&
                  (s.startsWith('http://') || s.startsWith('https://')) &&
                  !s.contains('gstatic.com') &&
                  !s.contains('googleapis.com') &&
                  !s.contains('firebase')) {
                // Bloqueia sumir do app por link externo acidental
                return NavigationActionPolicy.CANCEL;
              }
              return NavigationActionPolicy.ALLOW;
            },
            onLoadStop: (controller, url) async {
              await _onPageFinished(controller);
            },
            onReceivedError: (controller, request, error) {
              if (!mounted || request.isForMainFrame != true) return;
              // Nùo bloqueia toque ù sù registra
              debugPrint('WebView error: ${error.description}');
            },
            onConsoleMessage: (controller, msg) {
              if (msg.messageLevel == ConsoleMessageLevel.ERROR) {
                debugPrint('WebView console: ${msg.message}');
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
          if (!_pageLoaded)
            const IgnorePointer(
              child: ColoredBox(
                color: Color(0xFFF5F7FA),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(color: Color(0xFF134175)),
                      SizedBox(height: 16),
                      Text('Carregandoù', style: TextStyle(fontSize: 15)),
                    ],
                  ),
                ),
              ),
            ),
          if (_status != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 24,
              child: IgnorePointer(
                child: Material(
                  color: const Color(0xFF134175),
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
