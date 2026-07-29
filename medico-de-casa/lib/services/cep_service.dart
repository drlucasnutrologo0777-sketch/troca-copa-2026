import 'dart:convert';

import 'package:http/http.dart' as http;

class AddressData {
  const AddressData({
    this.cep = '',
    this.street = '',
    this.number = '',
    this.complement = '',
    this.neighborhood = '',
    this.city = '',
    this.state = '',
  });

  final String cep;
  final String street;
  final String number;
  final String complement;
  final String neighborhood;
  final String city;
  final String state;

  String get formattedLine {
    final parts = <String>[
      if (street.isNotEmpty) street,
      if (number.isNotEmpty) 'nº $number',
      if (complement.isNotEmpty) complement,
      if (neighborhood.isNotEmpty) neighborhood,
      if (city.isNotEmpty && state.isNotEmpty) '$city - $state',
      if (cep.isNotEmpty) 'CEP $cep',
    ];
    return parts.join(', ');
  }

  Map<String, dynamic> toMap() => {
        'cep': cep,
        'street': street,
        'number': number,
        'complement': complement,
        'neighborhood': neighborhood,
        'city': city,
        'state': state,
        'fullAddress': formattedLine,
      };

  bool get isComplete =>
      cep.replaceAll(RegExp(r'\D'), '').length == 8 &&
      street.trim().isNotEmpty &&
      number.trim().isNotEmpty &&
      city.trim().isNotEmpty &&
      state.trim().isNotEmpty;
}

class CepService {
  static String digitsOnly(String value) => value.replaceAll(RegExp(r'\D'), '');

  static String formatCep(String value) {
    final d = digitsOnly(value);
    if (d.length <= 5) return d;
    return '${d.substring(0, 5)}-${d.substring(5, d.length.clamp(0, 8))}';
  }

  static Future<AddressData?> fetchByCep(String cep) async {
    final digits = digitsOnly(cep);
    if (digits.length != 8) return null;

    final response = await http
        .get(Uri.parse('https://viacep.com.br/ws/$digits/json/'))
        .timeout(const Duration(seconds: 10));

    if (response.statusCode != 200) return null;

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (data['erro'] == true) return null;

    return AddressData(
      cep: formatCep(digits),
      street: data['logradouro'] as String? ?? '',
      neighborhood: data['bairro'] as String? ?? '',
      city: data['localidade'] as String? ?? '',
      state: data['uf'] as String? ?? '',
    );
  }
}
