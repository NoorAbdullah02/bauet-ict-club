import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../core/theme.dart';
import 'coder.dart';

/// Staggered entrance used across lists.
extension StaggerX on Widget {
  Widget stagger(int index, {int step = 70, int maxDelay = 700}) {
    final delay = (index * step).clamp(0, maxDelay);
    return animate()
        .fadeIn(duration: 450.ms, delay: delay.ms, curve: Curves.easeOut)
        .slideY(begin: 0.08, end: 0, duration: 520.ms, delay: delay.ms, curve: Curves.easeOutCubic);
  }
}

/// Aurora gradient backdrop (blue / aqua glows on the base colour).
class AuroraBackground extends StatelessWidget {
  const AuroraBackground({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final a = p.dark ? 0.36 : 0.24;
    // the moving glows live in their own layer, so they never repaint the screen content on top
    final backdrop = RepaintBoundary(
      child: Stack(
      children: [
        Positioned.fill(child: ColoredBox(color: p.bg)),
        Positioned(top: -150, left: -130, child: _Glow(color: p.accent.withValues(alpha: a), size: 440)),
        Positioned(top: 200, right: -170, child: _Glow(color: p.tech.withValues(alpha: a * 0.8), size: 380)),
        Positioned(bottom: -170, left: -70, child: _Glow(color: p.third.withValues(alpha: a * 0.7), size: 400)),
        Positioned(top: 330, left: 60, child: _Glow(color: p.third.withValues(alpha: a * 0.35), size: 300)),
        Positioned(bottom: 120, right: -120, child: _Glow(color: const Color(0xFF8B5CF6).withValues(alpha: a * 0.6), size: 320)),
        // faint grid that fades out toward the edges
        Positioned.fill(
          child: IgnorePointer(
            child: ShaderMask(
              blendMode: BlendMode.dstIn,
              shaderCallback: (r) => const RadialGradient(
                center: Alignment(0, -0.2),
                radius: 0.95,
                colors: [Colors.white, Colors.transparent],
                stops: [0.25, 1],
              ).createShader(r),
              child: CustomPaint(painter: _GridPainter(p.accent.withValues(alpha: p.dark ? 0.09 : 0.07))),
            ),
          ),
        ),
        // soft dark edge like the website
        if (p.dark) const Positioned.fill(child: IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(center: Alignment(0, -0.2), radius: 1.15, colors: [Colors.transparent, Color(0x8C020616)], stops: [0.55, 1]))))),
      ],
    ),
    );
    return Stack(children: [Positioned.fill(child: backdrop), Positioned.fill(child: child)]);
  }
}

class _GridPainter extends CustomPainter {
  const _GridPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;
    const step = 40.0;
    for (double x = 0; x <= size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y <= size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(_GridPainter old) => old.color != color;
}

class _Glow extends StatelessWidget {
  const _Glow({required this.color, required this.size});
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color, color.withValues(alpha: 0)]),
        ),
      )
          .animate(onPlay: (c) => c.repeat(reverse: true))
          .move(begin: const Offset(-14, -10), end: const Offset(14, 12), duration: 9.seconds, curve: Curves.easeInOut),
    );
  }
}

/// Frosted glass card.
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.radius = 24,
    this.onTap,
    this.gradient,
    this.blur = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;
  final Gradient? gradient;
  final bool blur;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final r = BorderRadius.circular(radius);
    Widget body = Container(
      padding: padding,
      decoration: BoxDecoration(
        borderRadius: r,
        gradient: gradient,
        color: gradient == null ? (p.dark ? p.surface.withValues(alpha: 0.62) : p.surface) : null,
        border: Border.all(color: p.line),
        boxShadow: p.dark
            ? null
            : [BoxShadow(color: const Color(0xFF0B0B0F).withValues(alpha: 0.05), blurRadius: 24, offset: const Offset(0, 10))],
      ),
      child: child,
    );
    if (blur && p.dark) {
      body = ClipRRect(
        borderRadius: r,
        child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14), child: body),
      );
    }
    if (onTap == null) return body;
    return GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap, child: body);
  }
}

class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.expand = true,
    this.colors,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final bool expand;
  final List<Color>? colors;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final enabled = onPressed != null && !loading;
    final cols = colors ?? p.gradient;
    return Opacity(
      opacity: enabled || loading ? 1 : 0.5,
      child: Material(
        color: Colors.transparent,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: cols),
            boxShadow: [BoxShadow(color: cols.first.withValues(alpha: 0.35), blurRadius: 22, offset: const Offset(0, 8))],
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: enabled
                ? () {
                    HapticFeedback.lightImpact();
                    onPressed!();
                  }
                : null,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
              child: Row(
                mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (loading)
                    const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                  else ...[
                    if (icon != null) ...[Icon(icon, size: 19, color: Colors.white), const SizedBox(width: 10)],
                    Flexible(
                      child: Text(label,
                          overflow: TextOverflow.ellipsis,
                          style: bodyStyle(context, color: Colors.white, weight: FontWeight.w700, size: 15)),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class GhostButton extends StatelessWidget {
  const GhostButton({super.key, required this.label, required this.onPressed, this.icon, this.expand = true});
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: p.fg,
        side: BorderSide(color: p.line.withValues(alpha: 0.5)),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
        minimumSize: expand ? const Size.fromHeight(0) : null,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
      child: Row(
        mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 8)],
          Text(label, style: bodyStyle(context, weight: FontWeight.w600, size: 14.5)),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.eyebrow, required this.title, this.subtitle, this.trailing});
  final String eyebrow;
  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                CodeLabel(eyebrow),
              ]),
              const SizedBox(height: 8),
              Text(title, style: displayStyle(context, 28)),
              if (subtitle != null) ...[
                const SizedBox(height: 6),
                Text(subtitle!, style: bodyStyle(context, color: p.muted, size: 13.5)),
              ],
            ],
          ),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}

/// Small rounded tag.
class Tag extends StatelessWidget {
  const Tag(this.text, {super.key, this.color, this.icon});
  final String text;
  final Color? color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = color ?? context.pal.accent;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: c.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 12, color: c), const SizedBox(width: 4)],
        Text(text.toUpperCase(), style: monoStyle(context, color: c, size: 9.5, weight: FontWeight.w700)),
      ]),
    );
  }
}

/// Pill-shaped selectable chip.
class PillChip extends StatelessWidget {
  const PillChip({super.key, required this.label, required this.selected, required this.onTap, this.icon, this.color});
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final c = color ?? p.accent;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: AnimatedContainer(
        duration: 220.ms,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(99),
          color: selected ? c.withValues(alpha: 0.2) : Colors.transparent,
          border: Border.all(color: selected ? c : p.line),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[Icon(icon, size: 15, color: selected ? c : p.muted), const SizedBox(width: 6)],
          Text(label, style: bodyStyle(context, size: 13, weight: FontWeight.w600, color: selected ? p.fg : p.muted)),
        ]),
      ),
    );
  }
}

/// Network image with shimmer placeholder + graceful error.
class NetImage extends StatelessWidget {
  const NetImage(this.url, {super.key, this.fit = BoxFit.cover, this.radius = 0, this.width, this.height, this.fallbackLabel});
  final String url;
  final BoxFit fit;
  final double radius;
  final double? width;
  final double? height;
  final String? fallbackLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    Widget fallback() => Container(
          width: width,
          height: height,
          alignment: Alignment.center,
          decoration: BoxDecoration(gradient: LinearGradient(colors: [p.accent.withValues(alpha: 0.35), p.tech.withValues(alpha: 0.35)])),
          child: fallbackLabel != null && fallbackLabel!.isNotEmpty
              ? Text(fallbackLabel!.characters.first.toUpperCase(), style: displayStyle(context, 28, color: Colors.white))
              : Icon(Icons.image_outlined, color: p.fg.withValues(alpha: 0.5)),
        );
    final Widget img = url.isEmpty
        ? fallback()
        : CachedNetworkImage(
            imageUrl: url,
            fit: fit,
            width: width,
            height: height,
            fadeInDuration: 300.ms,
            placeholder: (context, _) => ShimmerBox(width: width, height: height),
            errorWidget: (context, _, __) => fallback(),
          );
    if (radius <= 0) return img;
    return ClipRRect(borderRadius: BorderRadius.circular(radius), child: img);
  }
}

class ShimmerBox extends StatelessWidget {
  const ShimmerBox({super.key, this.width, this.height = 100, this.radius = 0});
  final double? width;
  final double? height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(color: p.alt, borderRadius: BorderRadius.circular(radius)),
    ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 1400.ms, color: p.fg.withValues(alpha: 0.08));
  }
}

class ShimmerList extends StatelessWidget {
  const ShimmerList({super.key, this.count = 4, this.height = 130});
  final int count;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < count; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: ShimmerBox(height: height, radius: 24),
          ),
      ],
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.message});
  final IconData icon;
  final String title;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: TerminalState(
        command: r'$ ls --all',
        lines: ['// ${title.toLowerCase()}', if (message != null) '# $message', '0 items found'],
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState({super.key, required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: TerminalState(
        command: r'$ fetch --retry',
        lines: ['error: $message', '# pull down to refresh or retry below'],
        isError: true,
        onRetry: onRetry,
      ),
    );
  }
}

/// Count-up number.
class CountUp extends StatelessWidget {
  const CountUp({super.key, required this.value, this.style});
  final int value;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.toDouble()),
      duration: 1200.ms,
      curve: Curves.easeOutCubic,
      builder: (context, v, _) => Text('${v.round()}', style: style ?? displayStyle(context, 30)),
    );
  }
}

/// Gradient-filled text.
class GradientText extends StatelessWidget {
  const GradientText(this.text, {super.key, required this.style, this.colors});
  final String text;
  final TextStyle style;
  final List<Color>? colors;

  @override
  Widget build(BuildContext context) {
    final cols = colors ?? context.pal.textGradient;
    return ShaderMask(
      blendMode: BlendMode.srcIn,
      shaderCallback: (rect) => LinearGradient(colors: cols).createShader(Rect.fromLTWH(0, 0, rect.width, rect.height)),
      child: Text(text, style: style.copyWith(color: Colors.white)),
    );
  }
}

/// Page padding used by all tab screens.
const EdgeInsets kPagePadding = EdgeInsets.fromLTRB(20, 8, 20, 120);
