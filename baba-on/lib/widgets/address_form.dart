import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/cep_service.dart';
import '../theme/app_theme.dart';

class AddressForm extends StatefulWidget {
  const AddressForm({
    super.key,
    required this.cep,
    required this.street,
    required this.number,
    required this.complement,
    required this.neighborhood,
    required this.city,
    required this.state,
  });

  final TextEditingController cep;
  final TextEditingController street;
  final TextEditingController number;
  final TextEditingController complement;
  final TextEditingController neighborhood;
  final TextEditingController city;
  final TextEditingController state;

  @override
  State<AddressForm> createState() => AddressFormState();
}

class AddressFormState extends State<AddressForm> {
  bool _loadingCep = false;
  String? _cepError;

  AddressData get data => AddressData(
        cep: widget.cep.text.trim(),
        street: widget.street.text.trim(),
        number: widget.number.text.trim(),
        complement: widget.complement.text.trim(),
        neighborhood: widget.neighborhood.text.trim(),
        city: widget.city.text.trim(),
        state: widget.state.text.trim(),
      );

  Future<void> lookupCep() async {
    final digits = CepService.digitsOnly(widget.cep.text);
    if (digits.length != 8) {
      setState(() => _cepError = 'Informe um CEP com 8 dígitos');
      return;
    }

    setState(() {
      _loadingCep = true;
      _cepError = null;
    });

    try {
      final result = await CepService.fetchByCep(digits);
      if (!mounted) return;
      if (result == null) {
        setState(() => _cepError = 'CEP não encontrado');
        return;
      }
      widget.cep.text = result.cep;
      widget.street.text = result.street;
      widget.neighborhood.text = result.neighborhood;
      widget.city.text = result.city;
      widget.state.text = result.state;
      FocusScope.of(context).requestFocus(FocusNode());
    } catch (_) {
      if (mounted) setState(() => _cepError = 'Erro ao buscar CEP. Verifique a internet.');
    } finally {
      if (mounted) setState(() => _loadingCep = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 2,
              child: TextFormField(
                controller: widget.cep,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(8),
                ],
                decoration: InputDecoration(
                  labelText: 'CEP',
                  hintText: '00000-000',
                  errorText: _cepError,
                  suffixIcon: _loadingCep
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : null,
                ),
                onChanged: (v) {
                  final formatted = CepService.formatCep(v);
                  if (formatted != v) {
                    widget.cep.value = TextEditingValue(
                      text: formatted,
                      selection: TextSelection.collapsed(offset: formatted.length),
                    );
                  }
                  if (CepService.digitsOnly(v).length == 8) lookupCep();
                },
              ),
            ),
            const SizedBox(width: 12),
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: OutlinedButton(
                onPressed: _loadingCep ? null : lookupCep,
                child: const Text('Buscar'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: widget.street,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Rua / logradouro'),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              flex: 2,
              child: TextFormField(
                controller: widget.number,
                keyboardType: TextInputType.text,
                decoration: const InputDecoration(labelText: 'Número'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 3,
              child: TextFormField(
                controller: widget.complement,
                decoration: const InputDecoration(labelText: 'Complemento (opcional)'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: widget.neighborhood,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Bairro'),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              flex: 3,
              child: TextFormField(
                controller: widget.city,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Cidade'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: widget.state,
                textCapitalization: TextCapitalization.characters,
                inputFormatters: [
                  LengthLimitingTextInputFormatter(2),
                  FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z]')),
                ],
                decoration: const InputDecoration(labelText: 'UF'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          'Digite o CEP para preencher rua, bairro, cidade e UF automaticamente.',
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary.withValues(alpha: 0.9)),
        ),
      ],
    );
  }
}
