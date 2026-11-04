import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Colour system shared with the website (royal blue / green on cloud-white, aqua on deep navy).
class Pal {
  const Pal({
    required this.dark,
    required this.bg,
    required this.surface,
    required this.alt,
    required this.fg,
    required this.muted,
    required this.line,
    required this.accent,
    required this.tech,
    required this.third,
    required this.gradient,
    required this.textGradient,
  });

  final bool dark;
  final Color bg;
  final Color surface;
  final Color alt;
  final Color fg;
  final Color muted;
  final Color line;
  final Color accent;
  final Color tech;
  final Color third;
  final List<Color> gradient;
  final List<Color> textGradient;

  static const Pal darkPal = Pal(
    dark: true,
    bg: Color(0xFF07122B),
    surface: Color(0xFF0E1D42),
    alt: Color(0xFF0A1735),
    fg: Color(0xFFEAF2FF),
    muted: Color(0xFFA8B9E0),
    line: Color(0x3396B4FF),
    accent: Color(0xFF6C9BFF),
    tech: Color(0xFF2FD6B0),
    third: Color(0xFF38C8F0),
    gradient: [Color(0xFF2F6BFF), Color(0xFF12B5E5)],
    textGradient: [Color(0xFF6C9BFF), Color(0xFF38C8F0), Color(0xFF35D989)],
  );

  static const Pal lightPal = Pal(
    dark: false,
    bg: Color(0xFFF5F8FF),
    surface: Color(0xFFFFFFFF),
    alt: Color(0xFFEBF1FC),
    fg: Color(0xFF0A1A3F),
    muted: Color(0xFF41527A),
    line: Color(0xFFD5E1F5),
    accent: Color(0xFF1F4FD8),
    tech: Color(0xFF0E9F6E),
    third: Color(0xFF17A2D8),
    gradient: [Color(0xFF1F4FD8), Color(0xFF2E7BFF)],
    textGradient: [Color(0xFF1F4FD8), Color(0xFF17A2D8), Color(0xFF18A957)],
  );

  LinearGradient get brand => LinearGradient(
        begin: const Alignment(-1, -0.6),
        end: const Alignment(1, 0.6),
        colors: gradient,
      );

  Color get onBrand => Colors.white;
}

extension PalContext on BuildContext {
  Pal get pal => Theme.of(this).brightness == Brightness.dark ? Pal.darkPal : Pal.lightPal;
}

/// Display face: Space Grotesk (both themes, for the coder look).
TextStyle displayStyle(BuildContext context, double size, {FontWeight weight = FontWeight.w700, Color? color, double? height, double? letterSpacing}) {
  final c = color ?? context.pal.fg;
  return GoogleFonts.spaceGrotesk(fontSize: size, fontWeight: weight, color: c, height: height ?? 1.08, letterSpacing: letterSpacing ?? -0.5);
}

TextStyle monoStyle(BuildContext context, {double size = 11, Color? color, FontWeight weight = FontWeight.w500}) {
  return GoogleFonts.jetBrainsMono(
    fontSize: size,
    fontWeight: weight,
    color: color ?? context.pal.muted,
    letterSpacing: 1.4,
  );
}

TextStyle bodyStyle(BuildContext context, {double size = 14.5, Color? color, FontWeight weight = FontWeight.w400, double height = 1.55}) {
  return GoogleFonts.inter(fontSize: size, fontWeight: weight, color: color ?? context.pal.fg, height: height);
}

ThemeData buildTheme(Pal p) {
  final brightness = p.dark ? Brightness.dark : Brightness.light;
  final base = ThemeData(brightness: brightness, useMaterial3: true);
  final scheme = ColorScheme(
    brightness: brightness,
    primary: p.accent,
    onPrimary: Colors.white,
    secondary: p.tech,
    onSecondary: p.dark ? const Color(0xFF06122B) : Colors.white,
    error: const Color(0xFFEF4444),
    onError: Colors.white,
    surface: p.surface,
    onSurface: p.fg,
  );
  final textTheme = GoogleFonts.interTextTheme(base.textTheme).apply(bodyColor: p.fg, displayColor: p.fg);
  OutlineInputBorder border(Color c, [double w = 1]) =>
      OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: c, width: w));

  return base.copyWith(
    colorScheme: scheme,
    scaffoldBackgroundColor: p.bg,
    canvasColor: p.bg,
    textTheme: textTheme,
    splashFactory: InkSparkle.splashFactory,
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      foregroundColor: p.fg,
      centerTitle: false,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.dark ? p.surface : p.alt.withValues(alpha: 0.6),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      labelStyle: GoogleFonts.inter(color: p.muted, fontSize: 14),
      hintStyle: GoogleFonts.inter(color: p.muted.withValues(alpha: 0.7), fontSize: 14),
      border: border(p.line),
      enabledBorder: border(p.line),
      focusedBorder: border(p.tech, 1.6),
      errorBorder: border(const Color(0xFFEF4444)),
      focusedErrorBorder: border(const Color(0xFFEF4444), 1.6),
      errorStyle: GoogleFonts.inter(color: const Color(0xFFEF4444), fontSize: 12),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: p.dark ? p.surface.withValues(alpha: 0.92) : p.surface.withValues(alpha: 0.95),
      indicatorColor: p.accent.withValues(alpha: 0.18),
      elevation: 0,
      height: 68,
      labelTextStyle: WidgetStatePropertyAll(GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w600)),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: p.dark ? p.alt : p.fg,
      contentTextStyle: GoogleFonts.inter(color: p.dark ? p.fg : p.bg, fontSize: 13.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: p.surface,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
    ),
    dividerColor: p.line,
  );
}
