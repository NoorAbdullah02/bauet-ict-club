import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/theme.dart';

/// One slice of a donut or one bar of a bar list.
class ChartSlice {
  const ChartSlice(this.label, this.value, this.color);
  final String label;
  final num value;
  final Color color;
}

/// Brand colours used by every chart, in the order they are handed out.
const List<Color> kChartColors = [
  Color(0xFF1F4FD8),
  Color(0xFF17A2D8),
  Color(0xFF18A957),
  Color(0xFFF5A524),
  Color(0xFFEF6B8A),
  Color(0xFF6C4DF6),
];

/// Ring chart with the total in the middle and a legend underneath.
class DonutChart extends StatelessWidget {
  const DonutChart({super.key, required this.slices, this.size = 150, this.centerLabel = 'TOTAL'});
  final List<ChartSlice> slices;
  final double size;
  final String centerLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final total = slices.fold<num>(0, (n, s) => n + s.value);
    return Column(mainAxisSize: MainAxisSize.min, children: [
      TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: const Duration(milliseconds: 900),
        curve: Curves.easeOutCubic,
        builder: (context, t, _) => SizedBox(
          width: size,
          height: size,
          child: CustomPaint(
            painter: _DonutPainter(slices, p.line, t),
            child: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text('${(total * t).round()}', style: displayStyle(context, size * 0.22)),
                Text(centerLabel, style: monoStyle(context, size: 9)),
              ]),
            ),
          ),
        ),
      ),
      const SizedBox(height: 10),
      Wrap(spacing: 12, runSpacing: 4, alignment: WrapAlignment.center, children: [
        for (final s in slices)
          Row(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: s.color, shape: BoxShape.circle)),
            const SizedBox(width: 5),
            Text('${s.label} · ${s.value}', style: bodyStyle(context, size: 11.5, color: p.muted)),
          ]),
      ]),
    ]);
  }
}

class _DonutPainter extends CustomPainter {
  _DonutPainter(this.slices, this.track, this.progress);
  final List<ChartSlice> slices;
  final Color track;
  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.width * 0.14;
    final rect = Rect.fromLTWH(stroke / 2, stroke / 2, size.width - stroke, size.height - stroke);
    final base = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = track;
    final total = slices.fold<num>(0, (n, s) => n + s.value);
    if (total <= 0) {
      canvas.drawArc(rect, 0, math.pi * 2, false, base);
      return;
    }
    var start = -math.pi / 2;
    final gap = slices.where((s) => s.value > 0).length > 1 ? 0.06 : 0.0;
    for (final s in slices) {
      if (s.value <= 0) continue;
      final sweep = (s.value / total) * math.pi * 2 * progress;
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = s.color;
      if (sweep > gap) canvas.drawArc(rect, start + gap / 2, sweep - gap, false, paint);
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(_DonutPainter old) => old.progress != progress || old.slices != slices;
}

/// Horizontal bars with a label on the left and the value at the end of each bar.
class BarList extends StatelessWidget {
  const BarList({super.key, required this.items, this.color});
  final List<ChartSlice> items;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final max = items.fold<num>(1, (m, s) => s.value > m ? s.value : m);
    return Column(children: [
      for (var i = 0; i < items.length; i++)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(children: [
            SizedBox(width: 74, child: Text(items[i].label, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12, color: p.muted))),
            Expanded(
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: (items[i].value / max).toDouble()),
                duration: Duration(milliseconds: 600 + i * 80),
                curve: Curves.easeOutCubic,
                builder: (context, t, _) => ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: Stack(children: [
                    Container(height: 12, color: p.line.withValues(alpha: 0.5)),
                    FractionallySizedBox(
                      widthFactor: t.clamp(0.0, 1.0),
                      child: Container(height: 12, decoration: BoxDecoration(gradient: LinearGradient(colors: [color ?? items[i].color, (color ?? items[i].color).withValues(alpha: 0.7)]))),
                    ),
                  ]),
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(width: 28, child: Text('${items[i].value}', textAlign: TextAlign.right, style: bodyStyle(context, size: 12, weight: FontWeight.w800))),
          ]),
        ),
    ]);
  }
}

/// Count items by a key, highest first, coloured from the brand palette.
List<ChartSlice> tallySlices<T>(Iterable<T> items, String Function(T) pick, {int take = 6, String fallback = 'Other'}) {
  final m = <String, int>{};
  for (final it in items) {
    final k = pick(it).trim().isEmpty ? fallback : pick(it).trim();
    m[k] = (m[k] ?? 0) + 1;
  }
  final entries = m.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
  return [for (var i = 0; i < entries.length && i < take; i++) ChartSlice(entries[i].key, entries[i].value, kChartColors[i % kChartColors.length])];
}
