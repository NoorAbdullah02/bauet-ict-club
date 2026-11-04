import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/theme.dart';
import '../state/app_state.dart';
import '../widgets/coder.dart';
import '../widgets/common.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _spin = AnimationController(vsync: this, duration: 6.seconds)..repeat();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // Start fetching content while the intro plays.
    context.read<AppState>().loadAll(fresh: false);
    _timer = Timer(const Duration(milliseconds: 2600), () {
      if (mounted) context.go('/home');
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _spin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Scaffold(
      body: AuroraBackground(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 150,
                height: 150,
                child: AnimatedBuilder(
                  animation: _spin,
                  builder: (context, _) {
                    final t = _spin.value * 2 * math.pi;
                    return Stack(alignment: Alignment.center, children: [
                      for (var i = 0; i < 3; i++)
                        Transform(
                          alignment: Alignment.center,
                          transform: Matrix4.identity()
                            ..setEntry(3, 2, 0.002)
                            ..rotateX(t * (i == 1 ? -1 : 1) + i * 1.0)
                            ..rotateY(t * 0.6 + i * 0.9),
                          child: Container(
                            width: 140 - i * 18.0,
                            height: 140 - i * 18.0,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: [p.accent, p.tech, p.third][i].withValues(alpha: 0.85), width: 2),
                            ),
                          ),
                        ),
                      const LogoImage.club(height: 54).animate().scale(begin: const Offset(0.4, 0.4), duration: 700.ms, curve: Curves.elasticOut),
                    ]);
                  },
                ),
              ),
              const SizedBox(height: 28),
              Text('BAUET', style: displayStyle(context, 40, letterSpacing: 6))
                  .animate()
                  .fadeIn(delay: 300.ms, duration: 600.ms)
                  .slideY(begin: 0.3, end: 0, duration: 600.ms, curve: Curves.easeOutCubic),
              GradientText('ICT CLUB', style: displayStyle(context, 22, letterSpacing: 8))
                  .animate()
                  .fadeIn(delay: 600.ms, duration: 600.ms),
              const SizedBox(height: 18),
              Row(mainAxisSize: MainAxisSize.min, children: [
                Text(r'$ ', style: monoStyle(context, size: 12.5, color: p.third)),
                Text('init community', style: monoStyle(context, size: 12.5, color: p.fg)),
                const SizedBox(width: 6),
                const BlinkingCursor(height: 15),
              ]).animate().fadeIn(delay: 900.ms, duration: 500.ms),
              const SizedBox(height: 40),
              SizedBox(
                width: 140,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(minHeight: 3, color: p.tech, backgroundColor: p.line),
                ),
              ).animate().fadeIn(delay: 700.ms),
              const SizedBox(height: 12),
              Text('// ${AppConfig.clubName.toLowerCase()}', style: monoStyle(context, size: 10)).animate().fadeIn(delay: 1200.ms),
            ],
          ),
        ),
      ),
    );
  }
}
