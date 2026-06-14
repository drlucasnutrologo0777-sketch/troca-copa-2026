import 'dart:async';

import 'package:flutter/material.dart';
import '../services/aviso_service.dart';
import '../services/mutual_match_service.dart';

/// Escuta matches mútuos e aceites em tempo real.
class AvisoListener extends StatefulWidget {
  const AvisoListener({super.key, required this.child});

  final Widget child;

  @override
  State<AvisoListener> createState() => _AvisoListenerState();
}

class _AvisoListenerState extends State<AvisoListener> {
  StreamSubscription? _matches;
  StreamSubscription? _aceites;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _iniciar());
  }

  void _iniciar() {
    _matches?.cancel();
    _aceites?.cancel();

    _matches = MutualMatchService.instance.meusMatchesMutuos().listen((lista) {
      if (mounted) AvisoService.instance.processarMatchesMutuos(context, lista);
    });
    _aceites = MutualMatchService.instance.aceitesRecebidos().listen((lista) {
      if (mounted) AvisoService.instance.processarAceitesRecebidos(context, lista);
    });
  }

  @override
  void dispose() {
    _matches?.cancel();
    _aceites?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
