import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

String _day(dynamic d) => d == null ? '' : d.toString().split('T').first;

/// 'open', 'closed' or 'finished', counting a passed deadline as closed (Bangladesh date).
String contestStatus(Map<String, dynamic> c) {
  final st = '${c['status'] ?? 'open'}';
  final dl = _day(c['deadline']);
  final today = DateTime.now().toUtc().add(const Duration(hours: 6)).toIso8601String().split('T').first;
  return st == 'open' && dl.isNotEmpty && dl.compareTo(today) < 0 ? 'closed' : st;
}

/// Hackathons and contests: pick one, sign your team up, see the results.
class ContestsScreen extends StatefulWidget {
  const ContestsScreen({super.key});

  @override
  State<ContestsScreen> createState() => _ContestsScreenState();
}

class _ContestsScreenState extends State<ContestsScreen> {
  late final AppState _state = context.read<AppState>();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final r = await _state.api.list('contests', fresh: true);
      if (mounted) setState(() => _rows = r);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Compete', title: 'Contests', subtitle: 'Hackathons and coding contests. Make a team and win prizes and points.'),
          const SizedBox(height: 14),
          if (_loading)
            const ShimmerList(count: 3, height: 130)
          else if (_error != null)
            ErrorState(message: _error!, onRetry: _load)
          else if (_rows.isEmpty)
            const EmptyState(icon: Icons.sports_esports_outlined, title: 'No contest right now', message: 'Check back soon.')
          else
            for (final c in _rows)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassCard(
                  onTap: () => context.push('/contests/${c['id']}'),
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Tag(contestStatus(c), color: contestStatus(c) == 'open' ? const Color(0xFF10B981) : p.muted),
                    const SizedBox(height: 8),
                    Text('${c['title']}', style: displayStyle(context, 22)),
                    if ('${c['description'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text('${c['description']}', maxLines: 3, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 13.5, color: p.muted))),
                    const SizedBox(height: 10),
                    if (_day(c['start_date']).isNotEmpty) _line(context, Icons.calendar_month_rounded, fmtDate(DateTime.tryParse(_day(c['start_date'])))),
                    if ('${c['location'] ?? ''}'.isNotEmpty) _line(context, Icons.place_rounded, '${c['location']}'),
                    _line(context, Icons.groups_rounded, 'Teams of ${c['team_min'] == c['team_max'] ? c['team_max'] : '${c['team_min']} to ${c['team_max']}'}'),
                  ]),
                ),
              ),
        ],
      ),
    );
  }

  Widget _line(BuildContext context, IconData i, String t) => Padding(
        padding: const EdgeInsets.only(top: 3),
        child: Row(children: [Icon(i, size: 15, color: context.pal.tech), const SizedBox(width: 8), Expanded(child: Text(t, style: bodyStyle(context, size: 12.5, color: context.pal.muted)))]),
      );
}
