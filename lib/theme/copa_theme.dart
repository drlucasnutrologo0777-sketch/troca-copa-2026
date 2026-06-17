import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Paleta própria — sem referência visual a álbum oficial ou evento esportivo.
abstract final class CopaColors {
  static const primario = Color(0xFF2563EB);
  static const secundario = Color(0xFFF97316);
  static const destaque = Color(0xFF10B981);
  static const fundoEscuro = Color(0xFF0F172A);
  static const fundoMedio = Color(0xFF1E293B);
  static const branco = Color(0xFFFFFFFF);
  static const textoEscuro = Color(0xFF0F172A);
  static const textoClaro = Color(0xFFE2E8F0);

  // Aliases usados no restante do app
  static const azul = primario;
  static const verde = destaque;
  static const amarelo = Color(0xFFFBBF24);
  static const vermelho = secundario;
  static const roxo = Color(0xFF6366F1);
  static const rosa = Color(0xFF38BDF8);

  static const List<Color> circulos = [
    primario,
    destaque,
    secundario,
    roxo,
    rosa,
  ];
}

ThemeData buildCopaTheme() {
  final base = GoogleFonts.nunitoTextTheme();
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: CopaColors.primario,
      primary: CopaColors.primario,
      secondary: CopaColors.secundario,
      surface: CopaColors.branco,
      brightness: Brightness.light,
    ),
    scaffoldBackgroundColor: CopaColors.fundoEscuro,
    textTheme: base.copyWith(
      headlineLarge: base.headlineLarge?.copyWith(
        fontWeight: FontWeight.w900,
        color: CopaColors.branco,
        letterSpacing: 0.8,
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
        backgroundColor: CopaColors.primario,
        foregroundColor: CopaColors.branco,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: CopaColors.branco.withValues(alpha: 0.96),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: CopaColors.primario, width: 2),
      ),
    ),
  );
}
