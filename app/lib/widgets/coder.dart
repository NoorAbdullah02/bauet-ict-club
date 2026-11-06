import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../core/theme.dart';

const Color _termBg = Color(0xFF050E22);
const Color _termGreen = Color(0xFF6EE7B7);
const Color _termRed = Color(0xFFFF6B8A);

/// `// comment` style section label.
class CodeLabel extends StatelessWidget {
  const CodeLabel(this.text, {super.key, this.color});
  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? context.pal.tech;
    return Text('// ${text.toLowerCase()}', style: monoStyle(context, color: c, size: 11.5, weight: FontWeight.w600));
  }
}

/// Small `</>` brand mark.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 32});
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.32),
        gradient: p.brand,
        boxShadow: [BoxShadow(color: p.gradient.first.withValues(alpha: 0.45), blurRadius: size * 0.5)],
      ),
      child: Text('</>', style: monoStyle(context, color: Colors.white, size: size * 0.36, weight: FontWeight.w800).copyWith(letterSpacing: -0.5)),
    );
  }
}

/// Blinking block cursor.
class BlinkingCursor extends StatelessWidget {
  const BlinkingCursor({super.key, this.color, this.height = 16});
  final Color? color;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(width: height * 0.55, height: height, color: color ?? context.pal.tech)
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .fade(begin: 0, end: 1, duration: 520.ms, curve: Curves.easeInOut);
  }
}

/// `$ command` line with a blinking cursor.
class PromptLine extends StatelessWidget {
  const PromptLine(this.command, {super.key});
  final String command;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: p.dark ? _termBg.withValues(alpha: 0.7) : p.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: p.line),
      ),
      child: Row(children: [
        Text(r'$', style: monoStyle(context, color: p.third, size: 13, weight: FontWeight.w700)),
        const SizedBox(width: 8),
        Expanded(child: Text(command, maxLines: 1, overflow: TextOverflow.ellipsis, style: monoStyle(context, color: p.fg, size: 12.5).copyWith(letterSpacing: 0.2))),
        const SizedBox(width: 6),
        BlinkingCursor(height: 14, color: p.tech),
      ]),
    );
  }
}

/// Terminal window used for empty / error / 404 states.
class TerminalState extends StatelessWidget {
  const TerminalState({super.key, required this.command, required this.lines, this.isError = false, this.onRetry, this.title = 'bash'});
  final String command;
  final List<String> lines;
  final bool isError;
  final VoidCallback? onRetry;
  final String title;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final mono = monoStyle(context, color: Colors.white70, size: 12.5).copyWith(height: 1.6, letterSpacing: 0.2);
    return Container(
      decoration: BoxDecoration(color: _termBg, borderRadius: BorderRadius.circular(22), border: Border.all(color: p.line)),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _TitleBar(title: title),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(command, style: mono.copyWith(color: _termGreen, fontWeight: FontWeight.w700)),
            for (final l in lines)
              Text(l, style: mono.copyWith(color: l.startsWith('error') ? _termRed : (l.startsWith('//') || l.startsWith('#') ? Colors.white38 : Colors.white70))),
            const SizedBox(height: 8),
            Row(children: [
              Text(r'$', style: mono.copyWith(color: _termGreen)),
              const SizedBox(width: 8),
              const BlinkingCursor(color: _termGreen),
            ]),
            if (onRetry != null) ...[
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 17),
                label: const Text('retry'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: isError ? _termRed : _termGreen,
                  side: BorderSide(color: (isError ? _termRed : _termGreen).withValues(alpha: 0.6)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ]),
        ),
      ]),
    ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.06, end: 0);
  }
}

class _TitleBar extends StatelessWidget {
  const _TitleBar({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    Widget dot(Color c) => Container(width: 10, height: 10, margin: const EdgeInsets.only(right: 6), decoration: BoxDecoration(shape: BoxShape.circle, color: c));
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
      child: Row(children: [
        dot(const Color(0xFFFF5F57)),
        dot(const Color(0xFFFEBC2E)),
        dot(const Color(0xFF28C840)),
        const Spacer(),
        Text(title, style: monoStyle(context, color: Colors.white38, size: 10.5)),
      ]),
    );
  }
}

class _Seg {
  const _Seg(this.text, this.color);
  final String text;
  final Color color;
}

/// Animated "typing" code window for the home hero.
class TerminalCard extends StatefulWidget {
  const TerminalCard({super.key});

  @override
  State<TerminalCard> createState() => _TerminalCardState();
}

class _TerminalCardState extends State<TerminalCard> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 3600));
  Timer? _start;

  @override
  void initState() {
    super.initState();
    _start = Timer(const Duration(milliseconds: 600), () {
      if (mounted) _ctrl.forward();
    });
  }

  @override
  void dispose() {
    _start?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  void _replay() {
    _ctrl.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    const kw = Color(0xFF38C8F0);
    const id = Color(0xFF2FD6B0);
    const fn = Color(0xFF6C9BFF);
    const str = Color(0xFF6EE7B7);
    const dim = Color(0xFFB4BEFF);
    const segs = [
      _Seg('const ', kw),
      _Seg('club', id),
      _Seg(' = { name: ', dim),
      _Seg("'BAUET ICT Club'", str),
      _Seg(' };\n', dim),
      _Seg('club', id),
      _Seg('.', dim),
      _Seg('join', fn),
      _Seg('(you);', dim),
    ];
    final total = segs.fold<int>(0, (a, s) => a + s.text.length);
    final base = monoStyle(context, color: Colors.white, size: 13.5).copyWith(height: 1.7, letterSpacing: 0.1);

    return RepaintBoundary(child: GestureDetector(
      onTap: _replay,
      child: Container(
        decoration: BoxDecoration(
          color: _termBg,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: p.accent.withValues(alpha: 0.4)),
          boxShadow: [BoxShadow(color: p.accent.withValues(alpha: p.dark ? 0.3 : 0.25), blurRadius: 34, offset: const Offset(0, 16))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const _TitleBar(title: 'club.js'),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 4, 18, 18),
            child: AnimatedBuilder(
              animation: _ctrl,
              builder: (context, _) {
                final shown = (_ctrl.value * total).floor();
                var left = shown;
                final spans = <TextSpan>[];
                for (final s in segs) {
                  if (left <= 0) break;
                  final take = left < s.text.length ? left : s.text.length;
                  spans.add(TextSpan(text: s.text.substring(0, take), style: TextStyle(color: s.color)));
                  left -= take;
                }
                final done = _ctrl.isCompleted;
                return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('// run me', style: base.copyWith(color: Colors.white38)),
                  Text.rich(TextSpan(style: base, children: spans)),
                  if (!done)
                    Container(width: 8, height: 16, color: Colors.white70)
                  else ...[
                    const BlinkingCursor(color: Colors.white70),
                    const SizedBox(height: 6),
                    Text('> welcome aboard ✓', style: base.copyWith(color: str)).animate().fadeIn(duration: 400.ms).slideX(begin: -0.05, end: 0),
                  ],
                ]);
              },
            ),
          ),
        ]),
      ),
    ));
  }
}

/// Club / university logo. On dark themes a soft white glow follows the logo shape
/// so the navy lettering stays readable on indigo.
class LogoImage extends StatelessWidget {
  const LogoImage.club({super.key, this.height = 48}) : asset = 'assets/logos/ict-club.png';
  const LogoImage.crest({super.key, this.height = 48}) : asset = 'assets/logos/bauet.png';

  final String asset;
  final double height;

  @override
  Widget build(BuildContext context) {
    final dark = context.pal.dark;
    final img = Image.asset(
      asset,
      height: height,
      fit: BoxFit.contain,
      errorBuilder: (context, _, __) => BrandMark(size: height),
    );
    if (!dark) return img;
    return RepaintBoundary(child: Stack(alignment: Alignment.center, children: [
      Opacity(
        opacity: 0.75,
        child: ImageFiltered(
          imageFilter: ui.ImageFilter.blur(sigmaX: 5, sigmaY: 5),
          child: ColorFiltered(colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn), child: img),
        ),
      ),
      img,
    ]));
  }
}

/// Friendly speech-bubble face (chat launcher / assistant avatar).
class ChatFace extends StatelessWidget {
  const ChatFace({super.key, this.size = 30, this.bubble = Colors.white, this.face});
  final double size;
  final Color bubble;
  final Color? face;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(size: Size(size, size), painter: _FacePainter(bubble, face ?? context.pal.gradient.first));
  }
}

class _FacePainter extends CustomPainter {
  _FacePainter(this.bubble, this.face);
  final Color bubble;
  final Color face;

  @override
  void paint(Canvas canvas, Size s) {
    final w = s.width;
    final h = s.height;
    final body = RRect.fromRectAndRadius(Rect.fromLTRB(w * 0.06, h * 0.1, w * 0.94, h * 0.76), Radius.circular(w * 0.3));
    final tail = Path()
      ..moveTo(w * 0.22, h * 0.7)
      ..lineTo(w * 0.16, h * 0.94)
      ..lineTo(w * 0.46, h * 0.74)
      ..close();
    final fill = Paint()..color = bubble;
    canvas.drawRRect(body, fill);
    canvas.drawPath(tail, fill);
    final ink = Paint()..color = face;
    canvas.drawCircle(Offset(w * 0.36, h * 0.38), w * 0.06, ink);
    canvas.drawCircle(Offset(w * 0.64, h * 0.38), w * 0.06, ink);
    final smile = Paint()
      ..color = face
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.065
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(Rect.fromCenter(center: Offset(w * 0.5, h * 0.44), width: w * 0.34, height: h * 0.24), 0.35, 2.45, false, smile);
  }

  @override
  bool shouldRepaint(covariant _FacePainter old) => old.bubble != bubble || old.face != face;
}

/// Gradient pill "Join us" with a white arrow disc.
class JoinPill extends StatelessWidget {
  const JoinPill({super.key, required this.onTap, this.label = 'Join us'});
  final VoidCallback onTap;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        height: 54,
        padding: const EdgeInsets.fromLTRB(22, 6, 6, 6),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(99),
          gradient: p.brand,
          boxShadow: [BoxShadow(color: p.gradient.first.withValues(alpha: 0.35), blurRadius: 20, offset: const Offset(0, 8))],
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(label, style: bodyStyle(context, color: Colors.white, weight: FontWeight.w800, size: 15.5)),
          Container(
            width: 42,
            height: 42,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
            child: Icon(Icons.arrow_forward_rounded, size: 21, color: p.gradient.first),
          ),
        ]),
      ),
    );
  }
}
