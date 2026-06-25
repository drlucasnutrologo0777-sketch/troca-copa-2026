import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/cep_service.dart';
import '../services/firestore_service.dart';
import '../widgets/address_form.dart';
import '../widgets/app_widgets.dart';
import 'home_shell.dart';

class FamilyRegisterScreen extends StatefulWidget {
  const FamilyRegisterScreen({super.key});

  @override
  State<FamilyRegisterScreen> createState() => _FamilyRegisterScreenState();
}

class _FamilyRegisterScreenState extends State<FamilyRegisterScreen> {
  final _addressKey = GlobalKey<AddressFormState>();
  final _cep = TextEditingController();
  final _street = TextEditingController();
  final _number = TextEditingController();
  final _complement = TextEditingController();
  final _neighborhood = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _patientName = TextEditingController();
  final _patientAge = TextEditingController();
  final _needs = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _cep.dispose();
    _street.dispose();
    _number.dispose();
    _complement.dispose();
    _neighborhood.dispose();
    _city.dispose();
    _state.dispose();
    _patientName.dispose();
    _patientAge.dispose();
    _needs.dispose();
    super.dispose();
  }

  AddressData get _address => _addressKey.currentState?.data ??
      AddressData(
        cep: _cep.text.trim(),
        street: _street.text.trim(),
        number: _number.text.trim(),
        complement: _complement.text.trim(),
        neighborhood: _neighborhood.text.trim(),
        city: _city.text.trim(),
        state: _state.text.trim(),
      );

  Future<void> _submit() async {
    final addr = _address;
    if (!addr.isComplete) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Preencha CEP, rua, número, cidade e UF')),
      );
      return;
    }

    final auth = context.read<AuthService>();
    final uid = auth.currentUid;
    if (uid == null) return;
    setState(() => _loading = true);
    try {
      final fs = context.read<FirestoreService>();
      await fs.saveClientProfile(
        uid: uid,
        data: {
          'fullName': auth.profile?.fullName ?? '',
          'email': auth.profile?.email ?? '',
          ...addr.toMap(),
          'address': addr.formattedLine,
        },
      );
      if (_patientName.text.trim().isNotEmpty) {
        await fs.savePatient(
          clientId: uid,
          data: {
            'name': _patientName.text.trim(),
            'age': int.tryParse(_patientAge.text) ?? 0,
            'careNeeds': _needs.text.trim(),
          },
        );
      }
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeShell(initialIndex: 0)),
        (_) => false,
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Cadastro Família',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Endereço do atendimento', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          Expanded(
            child: ListView(
              children: [
                AddressForm(
                  key: _addressKey,
                  cep: _cep,
                  street: _street,
                  number: _number,
                  complement: _complement,
                  neighborhood: _neighborhood,
                  city: _city,
                  state: _state,
                ),
                const SizedBox(height: 24),
                const Text('Sobre o idoso (opcional)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                TextFormField(controller: _patientName, decoration: const InputDecoration(labelText: 'Nome')),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _patientAge,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Idade'),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _needs,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Necessidades de cuidado'),
                ),
              ],
            ),
          ),
          PrimaryButton(label: 'Concluir cadastro', onPressed: _submit, loading: _loading),
        ],
      ),
    );
  }
}
