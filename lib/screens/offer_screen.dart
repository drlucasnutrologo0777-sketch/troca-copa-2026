import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/app_state.dart';
import '../utils/sticker_token_util.dart';
import '../theme/copa_theme.dart';
import '../widgets/album_picker.dart';
import '../widgets/copa_widgets.dart';

class OfferScreen extends StatelessWidget {
  const OfferScreen({super.key, this.vender = false});

  final bool vender;

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final qtd = app.ofertaAtual.length;
    final cheio = qtd >= TradeOffer.maxStickers;

    return Scaffold(
      body: CopaAlbumBackground(
        child: Column(
          children: [
            AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              iconTheme: const IconThemeData(color: CopaColors.branco),
              title: Text(
                vender ? 'Vender Figurinhas' : 'Oferecer Figurinhas',
                style: const TextStyle(color: CopaColors.branco, fontWeight: FontWeight.w900),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: CopaCard(
                color: cheio ? CopaColors.vermelho : CopaColors.amarelo,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$qtd/${TradeOffer.maxStickers}',
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: CopaColors.textoEscuro,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      cheio ? 'Limite atingido!' : 'figurinhas no anúncio',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
            if (app.ofertaAtual.isNotEmpty)
              SizedBox(
                height: 88,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  children: app.ofertaAtual.map((id) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Chip(
                        label: Text(StickerTokenUtil.rotulo(id)),
                        deleteIcon: const Icon(Icons.close, size: 18),
                        onDeleted: () => app.removerFigurinha(id),
                        backgroundColor: CopaColors.branco,
                      ),
                    );
                  }).toList(),
                ),
              ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: cheio
                    ? Center(
                        child: CopaCard(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('7/7 — anúncio completo! 🏆'),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: () async {
                                  final ok = await app.publicarOferta();
                                  if (context.mounted && ok) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Anúncio publicado!')),
                                    );
                                    Navigator.pop(context);
                                  }
                                },
                                child: const Text('PUBLICAR ANÚNCIO'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : AlbumPicker(
                        onSelected: (id) {
                          app.adicionarFigurinha(id);
                          if (app.ofertaAtual.length >= TradeOffer.maxStickers) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Limite de 7 figurinhas!')),
                            );
                          }
                        },
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
