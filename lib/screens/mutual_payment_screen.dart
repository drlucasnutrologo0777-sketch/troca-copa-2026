import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/pix_config.dart';
import '../services/mutual_match_service.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';
import 'chat_room_screen.dart';

class MutualPaymentScreen extends StatefulWidget {
  const MutualPaymentScreen({super.key, required this.mutualMatchId});

  final String mutualMatchId;

  @override
  State<MutualPaymentScreen> createState() => _MutualPaymentScreenState();
}

class _MutualPaymentScreenState extends State<MutualPaymentScreen> {
  bool _pago = false;
  bool _carregando = false;

  Future<void> _copiarPix() async {
    await Clipboard.setData(const ClipboardData(text: PixConfig.chave));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chave PIX copiada!')),
      );
    }
  }

  Future<void> _confirmar() async {
    setState(() => _carregando = true);
    try {
      await MutualMatchService.instance.confirmarPagamento(widget.mutualMatchId);
      setState(() => _pago = true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'PIX R\$ ${PixConfig.valorMatch.toStringAsFixed(2)} registrado!',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            backgroundColor: CopaColors.verde,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e')));
      }
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: const Text(
                'PIX — Match confirmado',
                style: TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: CopaCard(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (!_pago) ...[
                        Text(
                          'R\$ ${PixConfig.valorMatch.toStringAsFixed(2).replaceAll(".", ",")}',
                          style: const TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                            color: CopaColors.verde,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Só cobramos após aceite mútuo dos dois lados.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        _linha('PIX', PixConfig.chave),
                        _linha('Titular', PixConfig.titular),
                        const SizedBox(height: 20),
                        OutlinedButton.icon(
                          onPressed: _copiarPix,
                          icon: const Icon(Icons.copy),
                          label: const Text('COPIAR CHAVE PIX'),
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _carregando ? null : _confirmar,
                          child: _carregando
                              ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Text('JÁ PAGUEI — AGUARDAR OUTRO'),
                        ),
                      ] else ...[
                        const Icon(Icons.check_circle, color: CopaColors.verde, size: 64),
                        const SizedBox(height: 16),
                        const Text('Pagamento registrado!', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
                        const SizedBox(height: 8),
                        const Text(
                          'Quando os dois pagarem, nome, telefone e chat são liberados.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ChatRoomScreen(mutualMatchId: widget.mutualMatchId),
                            ),
                          ),
                          icon: const Icon(Icons.chat),
                          label: const Text('IR PARA CHAT'),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _linha(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Text('$k: ', style: const TextStyle(fontWeight: FontWeight.w800)),
            Expanded(child: Text(v)),
          ],
        ),
      );
}
