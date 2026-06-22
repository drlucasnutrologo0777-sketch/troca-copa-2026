import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Paleta única: zinc + azul. Sem verde/amarelo/roxo de álbum/Copa.
abstract final class CopaColors {
  static const primary = Color(0xFF2563EB);
  static const primaryDark = Color(0xFF1D4ED8);
  static const primarySoft = Color(0xFFEFF6FF);

  /// Compatibilidade com código existente — mesma família de cor.
  static const verde = primary;
  static const azul = primary;
  static const amarelo = Color(0xFF52525B);
  static const roxo = primary;
  static const rosa = Color(0xFF71717A);

  static const vermelho = Color(0xFFDC2626);
  static const branco = Color(0xFFFFFFFF);
  static const textoEscuro = Color(0xFF18181B);
  static const textoSuave = Color(0xFF71717A);
  static const fundo = Color(0xFFF4F4F5);
  static const fundoMedio = Color(0xFFE4E4E7);
  static const fundoClaro = Color(0xFFF4F4F5);
  static const bordaCard = Color(0xFFE4E4E7);

  static const List<Color> circulos = [
    Color(0xFF52525B),
    Color(0xFF71717A),
    Color(0xFF3F3F46),
    Color(0xFFA1A1AA),
    Color(0xFF2563EB),
    Color(0xFF1D4ED8),
  ];
}

ThemeData buildCopaTheme() {
  final base = GoogleFonts.interTextTheme();
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: CopaColors.primary,
      primary: CopaColors.primary,
      surface: CopaColors.branco,
      brightness: Brightness.light,
    ),
    scaffoldBackgroundColor: CopaColors.fundo,
    appBarTheme: const AppBarTheme(
      backgroundColor: CopaColors.branco,
      foregroundColor: CopaColors.textoEscuro,
      surfaceTintColor: CopaColors.branco,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: CopaColors.textoEscuro,
        fontWeight: FontWeight.w600,
        fontSize: 17,
      ),
      iconTheme: IconThemeData(color: CopaColors.textoEscuro),
    ),
    textTheme: base.copyWith(
      headlineLarge: base.headlineLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: CopaColors.textoEscuro,
        letterSpacing: -0.5,
      ),
      headlineSmall: base.headlineSmall?.copyWith(
        fontWeight: FontWeight.w700,
        color: CopaColors.textoEscuro,
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontWeight: FontWeight.w600,
        color: CopaColors.textoEscuro,
      ),
      bodyLarge: base.bodyLarge?.copyWith(
        color: CopaColors.textoEscuro,
        fontWeight: FontWeight.w400,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: CopaColors.primary,
        foregroundColor: CopaColors.branco,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: CopaColors.branco,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: CopaColors.bordaCard),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: CopaColors.bordaCard),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: CopaColors.primary, width: 2),
      ),
      labelStyle: const TextStyle(color: CopaColors.textoSuave, fontWeight: FontWeight.w500),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((s) =>
          s.contains(WidgetState.selected) ? CopaColors.branco : CopaColors.fundoMedio),
      trackColor: WidgetStateProperty.resolveWith((s) =>
          s.contains(WidgetState.selected) ? CopaColors.primary : CopaColors.bordaCard),
    ),
  );
}
