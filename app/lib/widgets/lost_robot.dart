import 'dart:math' as math;

import 'package:flutter/material.dart';

/// A little robot that floats around looking for the page with a magnifying glass.
/// One animation controller and one painter. It stands still when the device asks for less motion.
class LostRobot extends StatefulWidget {
  const LostRobot({super.key, this.size = 210});
  final double size;

  @override
  State<LostRobot> createState() => _LostRobotState();
}

class _LostRobotState extends State<LostRobot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 4));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.of(context).disableAnimations) {
      _c.stop();
    } else if (!_c.isAnimating) {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, _) => CustomPaint(size: Size(widget.size, widget.size * 0.96), painter: _RobotPainter(_c.value)),
        ),
      ),
    );
  }
}

class _RobotPainter extends CustomPainter {
  _RobotPainter(this.t);
  final double t; // 0..1, loops every 4 seconds

  static const _blue = Color(0xFF1F4FD8);
  static const _sky = Color(0xFF17A2D8);
  static const _ink = Color(0xFF06113A);
  static const _mint = Color(0xFF7CF0B2);

  double _sin(double phase, [double speed = 1]) => math.sin(2 * math.pi * (t * speed + phase));

  @override
  void paint(Canvas canvas, Size size) {
    final k = size.width / 240; // the drawing is made on a 240 x 230 board
    canvas.scale(k, k);
    final p = Paint()..isAntiAlias = true;

    // twinkling stars
    const stars = [(22.0, 40.0, 0.0), (212.0, 34.0, 0.15), (34.0, 150.0, 0.3), (206.0, 140.0, 0.45), (120.0, 12.0, 0.1), (64.0, 18.0, 0.55), (178.0, 18.0, 0.7)];
    for (final s in stars) {
      final a = 0.25 + 0.75 * (0.5 + 0.5 * _sin(s.$3, 1.5));
      p.color = const Color(0xFFFFD166).withValues(alpha: a);
      final path = Path()
        ..moveTo(s.$1, s.$2 - 5)
        ..lineTo(s.$1 + 1.6, s.$2 - 1.6)
        ..lineTo(s.$1 + 5, s.$2)
        ..lineTo(s.$1 + 1.6, s.$2 + 1.6)
        ..lineTo(s.$1, s.$2 + 5)
        ..lineTo(s.$1 - 1.6, s.$2 + 1.6)
        ..lineTo(s.$1 - 5, s.$2)
        ..lineTo(s.$1 - 1.6, s.$2 - 1.6)
        ..close();
      canvas.drawPath(path, p);
    }

    // question marks
    void q(String ch, double x, double y, double fs, Color c, double phase) {
      final tp = TextPainter(text: TextSpan(text: ch, style: TextStyle(fontSize: fs, fontWeight: FontWeight.w800, color: c)), textDirection: TextDirection.ltr)..layout();
      tp.paint(canvas, Offset(x, y - 6 * (0.5 + 0.5 * _sin(phase, 1))));
    }

    q('?', 24, 66, 26, _sky, 0.0);
    q('?', 194, 76, 20, const Color(0xFF8B5CF6), 0.5);

    final bob = -9 * (0.5 + 0.5 * _sin(0.0, 1)); // the robot floats up and down
    final shadowW = 48 * (1 - 0.2 * (-bob / 9));
    p.color = _ink.withValues(alpha: 0.26 - 0.1 * (-bob / 9));
    canvas.drawOval(Rect.fromCenter(center: const Offset(120, 214), width: shadowW * 2, height: 14), p);

    canvas.save();
    canvas.translate(0, bob);

    // jets
    final flame = 0.75 + 0.5 * (0.5 + 0.5 * _sin(0, 11));
    p.color = const Color(0xFFFF9F43);
    for (final x in [102.0, 138.0]) {
      final f = Path()
        ..moveTo(x - 4, 188)
        ..quadraticBezierTo(x, 188 + 20 * flame, x + 4, 188)
        ..close();
      canvas.drawPath(f, p);
    }

    // body
    p.shader = const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF2E7BFF), _blue]).createShader(const Rect.fromLTWH(82, 124, 76, 66));
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(82, 124, 76, 66), const Radius.circular(26)), p);
    p.shader = null;
    p.color = _ink.withValues(alpha: 0.35);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(102, 142, 36, 22), const Radius.circular(11)), p);
    p.color = const Color(0xFF35D989).withValues(alpha: 0.35);
    canvas.drawCircle(const Offset(120, 153), 13, p);
    p.color = const Color(0xFF35D989);
    canvas.drawCircle(const Offset(120, 153), 6, p);

    // left arm waves
    canvas.save();
    canvas.translate(84, 135);
    canvas.rotate(0.28 * _sin(0, 2.2));
    canvas.translate(-84, -135);
    p.color = const Color(0xFF2E7BFF);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(56, 132, 30, 14), const Radius.circular(7)), p);
    p.color = const Color(0xFFE8F0FF);
    canvas.drawCircle(const Offset(56, 139), 8, p);
    canvas.restore();

    // right arm with the magnifying glass sweeping left and right
    canvas.save();
    canvas.translate(154, 143);
    canvas.rotate(0.24 * _sin(0.25, 1.1));
    canvas.translate(-154, -143);
    p.color = const Color(0xFF2E7BFF);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(152, 136, 30, 14), const Radius.circular(7)), p);
    p
      ..color = const Color(0xFF7A4B2A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(188, 150), const Offset(210, 176), p);
    p
      ..style = PaintingStyle.fill
      ..color = const Color(0xFFCFEFFF).withValues(alpha: 0.6);
    canvas.drawCircle(const Offset(182, 140), 17, p);
    p
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..color = const Color(0xFF0B2A78);
    canvas.drawCircle(const Offset(182, 140), 17, p);
    p
      ..strokeWidth = 3
      ..color = Colors.white.withValues(alpha: 0.9);
    canvas.drawArc(const Rect.fromLTWH(171, 129, 22, 22), math.pi * 1.1, math.pi * 0.45, false, p);
    p.style = PaintingStyle.fill;
    canvas.restore();

    // antenna wobbles, the light pulses
    canvas.save();
    canvas.translate(120, 64);
    canvas.rotate(0.12 * _sin(0, 1.8));
    canvas.translate(-120, -64);
    p
      ..color = const Color(0xFF0B2A78)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(const Offset(120, 64), const Offset(120, 42), p);
    p.style = PaintingStyle.fill;
    p.color = const Color(0xFFFF6B8A).withValues(alpha: 0.55 + 0.45 * (0.5 + 0.5 * _sin(0, 2.8)));
    canvas.drawCircle(const Offset(120, 38), 8, p);
    canvas.restore();

    // head and face screen
    p.shader = const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF4A90FF), _sky]).createShader(const Rect.fromLTWH(72, 62, 96, 76));
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(72, 62, 96, 76), const Radius.circular(30)), p);
    p.shader = null;
    p.color = _ink;
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(84, 76, 72, 46), const Radius.circular(20)), p);
    // blinking eyes (shut for a moment about every 4 seconds)
    final open = (t > 0.9 && t < 0.94) ? 0.12 : 1.0;
    p.color = _mint;
    for (final x in [104.0, 136.0]) {
      canvas.drawOval(Rect.fromCenter(center: Offset(x, 96), width: 17, height: 21 * open), p);
    }
    p.color = Colors.white;
    if (open > 0.5) {
      canvas.drawCircle(const Offset(107, 92), 2.6, p);
      canvas.drawCircle(const Offset(139, 92), 2.6, p);
    }
    p
      ..color = _mint
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.4
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(Path()..moveTo(112, 112)..quadraticBezierTo(120, 106, 128, 112), p);
    p.style = PaintingStyle.fill;
    p.color = const Color(0xFF0B2A78);
    canvas.drawCircle(const Offset(76, 100), 6, p);
    canvas.drawCircle(const Offset(164, 100), 6, p);

    canvas.restore();
  }

  @override
  bool shouldRepaint(_RobotPainter old) => old.t != t;
}
