import 'dart:async';

import 'package:flutter/material.dart';

import '../core/calendar.dart';
import '../core/theme.dart';
import '../models/models.dart';
import 'common.dart';

/// Live countdown to the next upcoming event.
class CountdownCard extends StatefulWidget {
  const CountdownCard({super.key, required this.event, required this.onTap});
  final EventItem event;
  final VoidCallback onTap;

  @override
  State<CountdownCard> createState() => _CountdownCardState();
}

class _CountdownCardState extends State<CountdownCard> {
  Timer? _timer;
  Duration _left = Duration.zero;

  @override
  void initState() {
    super.initState();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final start = eventStart(widget.event);
    final left = start == null ? Duration.zero : start.difference(DateTime.now());
    if (mounted) setState(() => _left = left.isNegative ? Duration.zero : left);
  }

  @override
  void didUpdateWidget(covariant CountdownCard old) {
    super.didUpdateWidget(old);
    if (old.event.id != widget.event.id) _tick();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    String two(int n) => n.toString().padLeft(2, '0');
    final cells = <(String, String)>[
      ('${_left.inDays}', 'DAYS'),
      (two(_left.inHours % 24), 'HRS'),
      (two(_left.inMinutes % 60), 'MIN'),
      (two(_left.inSeconds % 60), 'SEC'),
    ];
    return GlassCard(
      onTap: widget.onTap,
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('// next event', style: monoStyle(context, color: p.tech, size: 11.5, weight: FontWeight.w600)),
        const SizedBox(height: 6),
        Text(widget.event.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: displayStyle(context, 20)),
        const SizedBox(height: 12),
        Row(children: [
          for (final c in cells)
            Expanded(
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), color: p.accent.withValues(alpha: 0.12)),
                child: Column(children: [
                  Text(c.$1, style: monoStyle(context, color: p.fg, size: 20, weight: FontWeight.w800)),
                  Text(c.$2, style: monoStyle(context, size: 9)),
                ]),
              ),
            ),
        ]),
      ]),
    );
  }
}
