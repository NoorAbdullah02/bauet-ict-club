import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../data/api.dart';
import '../../models/models.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_page.dart';

/// Numbers about one event: who signed up, who came, where they study, when they signed up, the money.
class AdminInsightsScreen extends StatefulWidget {
  const AdminInsightsScreen({super.key});

  @override
  State<AdminInsightsScreen> createState() => _AdminInsightsScreenState();
}

class _AdminInsightsScreenState extends State<AdminInsightsScreen> {
  late final AppState _state = context.read<AppState>();
  int? _eventId;
  Map<String, dynamic>? _d;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final ev = [..._state.events]..sort((a, b) => (b.date ?? DateTime(2000)).compareTo(a.date ?? DateTime(2000)));
    final first = ev.where((e) => e.isUpcoming).toList().lastOrNull ?? ev.firstOrNull;
    if (first != null) {
      _eventId = first.id;
      _load();
    }
  }

  Future<void> _load() async {
    final id = _eventId;
    if (id == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final d = await _state.api.adminCall('GET', '/event-registrations/analytics/$id', query: {'_': DateTime.now().millisecondsSinceEpoch});
      if (mounted) setState(() => _d = d is Map ? Map<String, dynamic>.from(d) : null);
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int _n(dynamic v) => int.tryParse('$v') ?? 0;

  Widget _card(String label, String value, String sub, Color c) => Expanded(
        child: GlassCard(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label.toUpperCase(), style: monoStyle(context, size: 9.5)),
            const SizedBox(height: 4),
            Text(value, style: displayStyle(context, 24, color: c)),
            Text(sub, maxLines: 2, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 11, color: context.pal.muted)),
          ]),
        ),
      );

  Widget _bars(String title, List<dynamic> list) {
    final p = context.pal;
    final items = list.whereType<Map>().take(6).toList();
    final top = items.fold<int>(1, (m, e) => _n(e['count']) > m ? _n(e['count']) : m);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title.toUpperCase(), style: monoStyle(context, size: 9.5)),
          const SizedBox(height: 10),
          for (final e in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(children: [
                SizedBox(width: 92, child: Text('${e['label']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12.5))),
                Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(value: _n(e['count']) / top, minHeight: 10, backgroundColor: p.alt, color: p.accent))),
                const SizedBox(width: 8),
                Text('${e['count']}', style: monoStyle(context, size: 11)),
              ]),
            ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final events = [..._state.events]..sort((a, b) => (b.date ?? DateTime(2000)).compareTo(a.date ?? DateTime(2000)));
    EventItem? chosen;
    for (final e in events) {
      if (e.id == _eventId) chosen = e;
    }
    final d = _d;
    final money = d?['money'] is Map ? Map<String, dynamic>.from(d!['money'] as Map) : null;
    final days = d?['by_day'] is List ? (d!['by_day'] as List).whereType<Map>().toList() : <Map>[];
    final dayTop = days.fold<int>(1, (m, e) => _n(e['count']) > m ? _n(e['count']) : m);
    return AdminPage(
      title: 'Event insights',
      onRefresh: _load,
      children: [
        PickerField(
          label: 'Event',
          value: chosen?.title ?? '',
          options: events.map((e) => e.title).toList(),
          icon: Icons.insights_rounded,
          onChanged: (v) {
            for (final e in events) {
              if (e.title == v) _eventId = e.id;
            }
            setState(() => _d = null);
            _load();
          },
        ),
        const SizedBox(height: 14),
        if (events.isEmpty)
          const EmptyState(icon: Icons.event_busy_rounded, title: 'No events yet', message: 'Create an event first.')
        else if (_loading && d == null)
          const ShimmerList(count: 3, height: 90)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else if (d == null || _n(d['total']) == 0)
          const EmptyState(icon: Icons.people_outline_rounded, title: 'No sign-ups yet', message: 'The numbers show up when people register.')
        else ...[
          Row(children: [
            _card('Signed up', '${d['total']}', d['seats_left'] == null ? 'no limit' : '${d['seats_left']} seats left of ${(d['event'] as Map)['capacity']}', p.accent),
            const SizedBox(width: 10),
            _card('Came', '${d['check_in_rate']}%', '${d['checked_in']} checked in', const Color(0xFF10B981)),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            _card('Waiting list', '${d['waiting']}', '${d['pending_payment']} waiting for payment', const Color(0xFF0EA5E9)),
            const SizedBox(width: 10),
            money != null ? _card('Money', '${money['amount']} BDT', '${money['online']} online · ${money['by_hand']} by hand${_n(money['to_check']) > 0 ? ' · ${money['to_check']} to check' : ''}', p.tech) : _card('Cancelled', '${d['cancelled']}', 'sign-ups', p.muted),
          ]),
          const SizedBox(height: 14),
          _bars('By department', d['by_department'] is List ? d['by_department'] as List : []),
          _bars('By batch', d['by_batch'] is List ? d['by_batch'] as List : []),
          if (days.length > 1)
            GlassCard(
              padding: const EdgeInsets.all(14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('SIGN-UPS BY DAY', style: monoStyle(context, size: 9.5)),
                const SizedBox(height: 12),
                SizedBox(
                  height: 90,
                  child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    for (final e in days) Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 1), child: FractionallySizedBox(heightFactor: (_n(e['count']) / dayTop).clamp(0.06, 1.0), alignment: Alignment.bottomCenter, child: Container(decoration: BoxDecoration(color: p.tech.withValues(alpha: 0.75), borderRadius: BorderRadius.circular(3)))))),
                  ]),
                ),
                const SizedBox(height: 4),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('${days.first['day']}', style: monoStyle(context, size: 9.5, color: p.muted)), Text('${days.last['day']}', style: monoStyle(context, size: 9.5, color: p.muted))]),
              ]),
            ),
        ],
      ],
    );
  }
}
