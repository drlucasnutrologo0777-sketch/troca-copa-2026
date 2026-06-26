import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Cores extraídas da capa Panini Copa 2026 (círculos coloridos).
abstract final class CopaColors {
  static const vermelho = Color(0xFFE84C3D);
  static const verde = Color(0xFF3DAA7D);
  static const azul = Color(0xFF2B9ED8);
  static const amarelo = Color(0xFFF5C518);
  static const roxo = Color(0xFF8B5CF6);
  static const rosa = Color(0xFFE879F9);
  static const branco = Color(0xFFFFFFFF);
  static const textoEscuro = Color(0xFF1A1A2E);

  /// Aliases usados em telas mais novas.
  static const primary = azul;
  static const textoSuave = Color(0xFF6B7280);
  static const fundo = Color(0xFF1E3A5F);
  static const primarySoft = Color(0xFFE8F4FC);
  static const bordaCard = Color(0xFFE5E7EB);

  static const List<Color> circulos = [
    vermelho,
    verde,
    azul,
    amarelo,
    roxo,
    rosa,
  ];
}

ThemeData buildCopaTheme() {
  final base = GoogleFonts.nunitoTextTheme();
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: CopaColors.azul,
      primary: CopaColors.azul,
      secondary: CopaColors.amarelo,
      surface: CopaColors.branco,
    ),
    textTheme: base.copyWith(
      headlineLarge: base.headlineLarge?.copyWith(
        fontWeight: FontWeight.w900,
        color: CopaColors.branco,
        letterSpacing: 1.2,
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontWeight: FontWeight.w800,
        color: CopaColors.textoEscuro,
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        color: CopaColors.textoEscuro,
        fontWeight: FontWeight.w600,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: CopaColors.amarelo,
        foregroundColor: CopaColors.textoEscuro,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: CopaColors.branco.withValues(alpha: 0.92),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: CopaColors.amarelo, width: 2),
      ),
    ),
  );
}
