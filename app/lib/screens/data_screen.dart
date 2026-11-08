import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/i18n.dart';
import '../core/offline_cache.dart';
import '../core/theme.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

/// Public numbers about the club (counts only). Kept on the phone, so the last numbers show without internet.
class DataScreen extends StatefulWidget {
  const DataScreen({super.key});
  @override
  State<DataScreen> createState() => _DataScreenState();
}

class _DataScreenState extends State<DataScreen> {
  Map<String, dynamic>? _d;
  String? _error;
  bool _loading = true;

  static const _labels = <(String, String)>[
    ('members', 'Members'), ('events', 'Events'), ('registrations', 'Event sign-ups'), ('projects', 'Projects'), ('notices', 'Notices'),
    ('contests', 'Contests'), ('jobs', 'Jobs'), ('gallery', 'Photos'), ('achievements', 'Awards'), ('advisors', 'Advisors'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = context.read<AppState>().api;
    final cached = await readCachedJson('dataset');
    if (cached != null && mounted) setState(() { _d = cached.data; _loading = false; });
    try {
      final d = await api.dataset();
      await cacheJson('dataset', d);
      if (mounted) setState(() { _d = d; _error = null; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _loading = false; if (_d == null) _error = e.toString(); });
    }
  }

  List<(String, int)> _rows(String key) => [for (final r in (_d?[key] as List? ?? const [])) ((r as Map)['name'].toString(), (r['count'] as num).toInt())];

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return RefreshIndicator(
      color: p.tech,
      onRefresh: _load,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SectionHeader(eyebrow: tr('Club data'), title: tr('The club in numbers'), subtitle: tr('Counts only: no names, phone numbers or emails.')),
          const SizedBox(height: 18),
          if (_loading && _d == null) const ShimmerList(count: 4, height: 80)
          else if (_d == null) ErrorState(message: _error ?? 'Could not load', onRetry: _load)
          else ...[
            LayoutBuilder(builder: (c, box) {
              final w = (box.maxWidth - 10) / 2;
              final totals = Map<String, dynamic>.from(_d!['totals'] as Map);
              return Wrap(spacing: 10, runSpacing: 10, children: [
                for (final (k, l) in _labels)
                  SizedBox(
                    width: w,
                    child: Semantics(
                      label: '${tr(l)}: ${totals[k] ?? 0}',
                      excludeSemantics: true,
                      child: GlassCard(
                        radius: 20,
                        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                        child: Column(children: [
                          Text('${totals[k] ?? 0}', style: displayStyle(context, 30)),
                          const SizedBox(height: 4),
                          Text(tr(l), style: bodyStyle(context, size: 12, color: p.muted)),
                        ]),
                      ),
                    ),
                  ),
              ]);
            }),
            const SizedBox(height: 16),
            _bars(context, tr('Events per year'), _rows('eventsByYear')),
            _bars(context, tr('Members by department'), _rows('membersByDepartment')),
            _bars(context, tr('Members by committee session'), _rows('membersBySession')),
          ],
        ],
      ),
    );
  }

  Widget _bars(BuildContext context, String title, List<(String, int)> rows) {
    if (rows.isEmpty) return const SizedBox.shrink();
    final p = context.pal;
    final max = rows.map((r) => r.$2).reduce((a, b) => a > b ? a : b).clamp(1, 1 << 30);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        radius: 20,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: displayStyle(context, 17)),
          const SizedBox(height: 12),
          for (final (name, n) in rows)
            Semantics(
              label: '$name: $n',
              excludeSemantics: true,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(children: [
                  SizedBox(width: 92, child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12.5, color: p.muted))),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(value: n / max, minHeight: 9, color: p.tech, backgroundColor: p.line),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text('$n', style: bodyStyle(context, size: 12.5, weight: FontWeight.w700)),
                ]),
              ),
            ),
        ]),
      ),
    );
  }
}
