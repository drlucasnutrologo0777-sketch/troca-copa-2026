import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Paleta neutra — sem cores de álbum Copa/Panini/FIFA.
abstract final class CopaColors {
  static const primary = Color(0xFF455A64);
  static const verde = Color(0xFF2E7D6B);
  static const azul = Color(0xFF546E7A);
  /// Accent neutro (substitui amarelo Copa nos botões).
  static const amarelo = Color(0xFF607D8B);
  static const vermelho = Color(0xFFB71C1C);
  static const roxo = Color(0xFF5C6BC0);
  static const rosa = Color(0xFF78909C);
  static const branco = Color(0xFFFFFFFF);
  static const textoEscuro = Color(0xFF263238);
  static const fundo = Color(0xFF37474F);
  static const fundoClaro = Color(0xFFECEFF1);

  /// Tons distintos para listas (grupos) — todos neutros.
  static const List<Color> circulos = [
    Color(0xFF546E7A),
    Color(0xFF607D8B),
    Color(0xFF78909C),
    Color(0xFF455A64),
    Color(0xFF2E7D6B),
    Color(0xFF5C6BC0),
  ];
}

ThemeData buildCopaTheme() {
  final base = GoogleFonts.nunitoTextTheme();
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: CopaColors.primary,
      primary: CopaColors.primary,
      secondary: CopaColors.verde,
      surface: CopaColors.branco,
    ),
    scaffoldBackgroundColor: CopaColors.fundoClaro,
    textTheme: base.copyWith(
      headlineLarge: base.headlineLarge?.copyWith(
        fontWeight: FontWeight.w900,
        color: CopaColors.branco,
        letterSpacing: 0.5,
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
        backgroundColor: CopaColors.primary,
        foregroundColor: CopaColors.branco,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: CopaColors.branco.withValues(alpha: 0.98),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: CopaColors.verde, width: 2),
      ),
    ),
  );
}
