import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/pix_config.dart';
import '../models/models.dart';
import '../services/offer_match_service.dart';
import '../theme/copa_theme.dart';
import '../widgets/copa_widgets.dart';
import 'chat_screen.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key, required this.requestId, required this.solicitacao});

  final String requestId;
  final MatchRequest solicitacao;

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
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

  Future<void> _confirmarPagamento() async {
    setState(() => _carregando = true);
    try {
      await MatchService.instance.confirmarPagamentoMatch(widget.requestId);
      setState(() => _pago = true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'PIX de R\$ ${PixConfig.valorMatch.toStringAsFixed(2)} registrado! Chat liberado.',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            backgroundColor: CopaColors.verde,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.solicitacao;

    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: const Text(
                'Pagamento PIX',
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
                          'R\$ ${PixConfig.valorMatch.toStringAsFixed(2).replaceAll('.', ',')}',
                          style: const TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                            color: CopaColors.verde,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Cada match aceito gera R\$ ${PixConfig.valorMatch.toStringAsFixed(2)} para ${PixConfig.titular}.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        _linha('PIX (telefone)', PixConfig.chave),
                        _linha('Titular', PixConfig.titular),
                        _linha('Valor', 'R\$ ${PixConfig.valorMatch.toStringAsFixed(2)}'),
                        const SizedBox(height: 8),
                        Text(
                          'Você DÁ: ${s.euDou.join(", ")}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 12),
                        ),
                        Text(
                          'Você RECEBE: ${s.euRecebo.join(", ")}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 12),
                        ),
                        const SizedBox(height: 20),
                        OutlinedButton.icon(
                          onPressed: _copiarPix,
                          icon: const Icon(Icons.copy),
                          label: const Text('COPIAR CHAVE PIX'),
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _carregando ? null : _confirmarPagamento,
                          child: _carregando
                              ? const SizedBox(
                                  height: 22,
                                  width: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('JÁ PAGUEI — LIBERAR CHAT'),
                        ),
                      ] else ...[
                        const Icon(Icons.check_circle, color: CopaColors.verde, size: 64),
                        const SizedBox(height: 16),
                        const Text(
                          'Pagamento registrado!',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Chat liberado. Combine a troca com o colecionador.',
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          onPressed: () => Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(builder: (_) => const ChatScreen()),
                          ),
                          icon: const Icon(Icons.chat),
                          label: const Text('ABRIR CHAT'),
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
