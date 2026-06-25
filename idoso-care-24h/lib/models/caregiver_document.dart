class CaregiverDocument {
  const CaregiverDocument({
    required this.id,
    required this.documentType,
    required this.fileUrl,
    this.status = 'approved',
    this.label,
  });

  final String id;
  final String documentType;
  final String fileUrl;
  final String status;
  final String? label;

  factory CaregiverDocument.fromMap(String id, Map<String, dynamic> data) {
    return CaregiverDocument(
      id: id,
      documentType: data['documentType'] as String? ?? '',
      fileUrl: data['fileUrl'] as String? ?? '',
      status: data['status'] as String? ?? 'pending',
      label: data['label'] as String?,
    );
  }

  String get displayName {
    if (label != null && label!.isNotEmpty) return label!;
    const map = {
      'RG': 'RG',
      'CPF': 'CPF',
      'Comprovante': 'Comprovante de endereço',
      'CarteiraTrabalho': 'Carteira de Trabalho',
      'AntecedentesCriminais': 'Antecedentes criminais',
      'CursoCuidador': 'Curso de Cuidador',
      'PrimeirosSocorros': 'Primeiros socorros',
      'Diploma': 'Diploma / Certificado',
      'INSS': 'INSS / PIS',
      'Referencia': 'Comprovante de experiência',
    };
    return map[documentType] ?? documentType;
  }
}
