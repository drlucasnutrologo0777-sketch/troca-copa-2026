import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/cep_service.dart';
import '../services/firestore_service.dart';
import '../widgets/address_form.dart';
import '../widgets/app_widgets.dart';
import 'home_shell.dart';

class CaregiverRegisterScreen extends StatefulWidget {
  const CaregiverRegisterScreen({super.key});

  @override
  State<CaregiverRegisterScreen> createState() => _CaregiverRegisterScreenState();
}

class _CaregiverRegisterScreenState extends State<CaregiverRegisterScreen> {
  final _page = PageController();
  final _addressKey = GlobalKey<AddressFormState>();
  int _step = 0;
  bool _loading = false;

  final _cep = TextEditingController();
  final _street = TextEditingController();
  final _number = TextEditingController();
  final _complement = TextEditingController();
  final _neighborhood = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _bio = TextEditingController();
  final _dailyRate = TextEditingController();
  final _hourRate = TextEditingController();
  final _specialty = TextEditingController();
  final List<String> _specialties = [];

  @override
  void dispose() {
    _page.dispose();
    _cep.dispose();
    _street.dispose();
    _number.dispose();
    _complement.dispose();
    _neighborhood.dispose();
    _city.dispose();
    _state.dispose();
    _bio.dispose();
    _dailyRate.dispose();
    _hourRate.dispose();
    _specialty.dispose();
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

  bool _validateStep() {
    if (_step == 0) {
      final addr = _address;
      if (!addr.isComplete) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Preencha CEP, rua, número, cidade e UF')),
        );
        return false;
      }
    }
    return true;
  }

  Future<void> _submit() async {
    final auth = context.read<AuthService>();
    final uid = auth.currentUid;
    if (uid == null) return;
    final addr = _address;

    setState(() => _loading = true);
    try {
      await context.read<FirestoreService>().saveCaregiverProfile(
        uid: uid,
        data: {
          'fullName': auth.profile?.fullName ?? '',
          'email': auth.profile?.email ?? '',
          ...addr.toMap(),
          'city': addr.city,
          'bio': _bio.text.trim(),
          'specialties': _specialties,
          'dailyRate': double.tryParse(_dailyRate.text.replaceAll(',', '.')),
          'hourRate': double.tryParse(_hourRate.text.replaceAll(',', '.')),
          'approved': false,
        },
      );
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeShell(initialIndex: 0)),
        (_) => false,
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _next() {
    if (!_validateStep()) return;
    if (_step < 2) {
      setState(() => _step++);
      _page.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    } else {
      _submit();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Cadastro Cuidador (${_step + 1}/3)',
      child: Column(
        children: [
          LinearProgressIndicator(value: (_step + 1) / 3),
          const SizedBox(height: 16),
          Expanded(
            child: PageView(
              controller: _page,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _stepForm('Endereço', [
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
                ]),
                _stepForm('Sobre você', [
                  TextFormField(
                    controller: _bio,
                    maxLines: 4,
                    decoration: const InputDecoration(labelText: 'Sobre mim'),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _specialty,
                          decoration: const InputDecoration(labelText: 'Ex: Alzheimer, Parkinson'),
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          if (_specialty.text.trim().isEmpty) return;
                          setState(() {
                            _specialties.add(_specialty.text.trim());
                            _specialty.clear();
                          });
                        },
                        icon: const Icon(Icons.add_circle),
                      ),
                    ],
                  ),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _specialties
                        .map((s) => Chip(label: Text(s), onDeleted: () => setState(() => _specialties.remove(s))))
                        .toList(),
                  ),
                ]),
                _stepForm('Valores', [
                  TextFormField(
                    controller: _hourRate,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Valor por hora (R\$)'),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _dailyRate,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Valor por dia (R\$)'),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Seu perfil será analisado pela equipe antes de aparecer para famílias.',
                    style: TextStyle(color: Colors.grey),
                  ),
                ]),
              ],
            ),
          ),
          PrimaryButton(
            label: _step < 2 ? 'Próximo' : 'Enviar para aprovação',
            onPressed: _next,
            loading: _loading,
          ),
        ],
      ),
    );
  }

  Widget _stepForm(String title, List<Widget> fields) {
    return ListView(
      children: [
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        const SizedBox(height: 16),
        ...fields,
      ],
    );
  }
}
