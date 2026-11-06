import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/calendar.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../models/models.dart';
import 'common.dart';

const _months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/// Month view of the events: dots on days that have something, tap a day to list its events (each with "Google Calendar").
class EventCalendarView extends StatefulWidget {
  const EventCalendarView({super.key, required this.events});
  final List<EventItem> events;

  @override
  State<EventCalendarView> createState() => _EventCalendarViewState();
}

class _EventCalendarViewState extends State<EventCalendarView> {
  late DateTime _month = _start();
  DateTime? _picked;

  DateTime _start() {
    final now = DateTime.now();
    final dated = widget.events.where((e) => e.date != null).map((e) => e.date!).toList()..sort();
    final next = dated.where((d) => !DateTime(d.year, d.month, d.day).isBefore(DateTime(now.year, now.month, now.day))).firstOrNull;
    final d = next ?? (dated.isNotEmpty ? dated.last : now);
    return DateTime(d.year, d.month);
  }

  bool _same(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;
  List<EventItem> _on(DateTime d) => widget.events.where((e) => e.date != null && _same(e.date!, d)).toList();

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final daysIn = DateTime(_month.year, _month.month + 1, 0).day;
    final lead = DateTime(_month.year, _month.month, 1).weekday % 7; // Sunday first
    final today = DateTime.now();
    final shown = _picked != null
        ? _on(_picked!)
        : (widget.events.where((e) => e.date != null && e.date!.year == _month.year && e.date!.month == _month.month).toList()..sort((a, b) => a.date!.compareTo(b.date!)));

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      GlassCard(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
        child: Column(children: [
          Row(children: [
            IconButton(onPressed: () => setState(() { _month = DateTime(_month.year, _month.month - 1); _picked = null; }), icon: const Icon(Icons.chevron_left_rounded)),
            Expanded(child: Text('${_months[_month.month - 1]} ${_month.year}', textAlign: TextAlign.center, style: displayStyle(context, 19))),
            IconButton(onPressed: () => setState(() { _month = DateTime(_month.year, _month.month + 1); _picked = null; }), icon: const Icon(Icons.chevron_right_rounded)),
          ]),
          Row(children: [for (final d in const ['S', 'M', 'T', 'W', 'T', 'F', 'S']) Expanded(child: Center(child: Text(d, style: monoStyle(context, size: 10, color: p.muted))))]),
          const SizedBox(height: 4),
          GridView.count(
            crossAxisCount: 7,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              for (var i = 0; i < lead; i++) const SizedBox.shrink(),
              for (var day = 1; day <= daysIn; day++) _cell(context, p, DateTime(_month.year, _month.month, day), today),
            ],
          ),
        ]),
      ),
      const SizedBox(height: 14),
      if (_picked != null)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(children: [
            Text(fmtDate(_picked), style: monoStyle(context, size: 11, color: p.muted)),
            TextButton(onPressed: () => setState(() => _picked = null), child: const Text('Show the whole month')),
          ]),
        ),
      if (shown.isEmpty)
        Padding(padding: const EdgeInsets.all(16), child: Text('No events in ${_months[_month.month - 1]}. Use the arrows to look at other months.', style: bodyStyle(context, color: p.muted)))
      else
        for (final e in shown)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: GlassCard(
              padding: const EdgeInsets.all(14),
              onTap: () => context.push('/events/${e.id}'),
              child: Row(children: [
                Container(
                  width: 54,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), color: p.accent.withValues(alpha: 0.12)),
                  child: Column(children: [Text('${e.date!.day}', style: displayStyle(context, 20, color: p.accent)), Text(monthShort(e.date!).toUpperCase(), style: monoStyle(context, size: 9, color: p.accent))]),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(e.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700, size: 15)),
                    Text([e.time, e.location].where((x) => x.isNotEmpty).join(' · '), maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12.5, color: p.muted)),
                  ]),
                ),
                IconButton(tooltip: 'Add to Google Calendar', onPressed: () => openUrl(context, googleCalendarUri(e).toString()), icon: Icon(Icons.event_available_rounded, color: p.tech)),
              ]),
            ),
          ),
    ]);
  }

  Widget _cell(BuildContext context, Pal p, DateTime d, DateTime today) {
    final list = _on(d);
    final sel = _picked != null && _same(_picked!, d);
    final isToday = _same(d, today);
    return Padding(
      padding: const EdgeInsets.all(2),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: list.isEmpty ? null : () => setState(() => _picked = sel ? null : d),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            color: sel ? p.accent : null,
            border: isToday && !sel ? Border.all(color: p.tech) : null,
          ),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text('${d.day}', style: bodyStyle(context, size: 13.5, weight: list.isEmpty ? FontWeight.w400 : FontWeight.w700, color: sel ? Colors.white : (list.isEmpty ? p.muted : p.fg))),
            const SizedBox(height: 2),
            if (list.isNotEmpty) Row(mainAxisSize: MainAxisSize.min, children: [for (var i = 0; i < list.length.clamp(0, 3); i++) Container(width: 5, height: 5, margin: const EdgeInsets.symmetric(horizontal: 1), decoration: BoxDecoration(shape: BoxShape.circle, color: sel ? Colors.white : p.tech))]) else const SizedBox(height: 5),
          ]),
        ),
      ),
    );
  }
}
