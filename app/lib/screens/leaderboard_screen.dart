import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/i18n.dart';
import '../core/theme.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

/// Points and badges earned by coming to events. Names are masked (Rahim K.).
class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  late final AppState _state = context.read<AppState>();
  Map<String, dynamic>? _d;
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
      final d = await _state.api.leaderboard();
      if (mounted) setState(() => _d = d);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final d = _d;
    final top = d?['top'] is List ? (d!['top'] as List).whereType<Map>().toList() : <Map>[];
    final badges = d?['badges'] is List ? (d!['badges'] as List).whereType<Map>().toList() : <Map>[];
    final per = d?['per_event'] ?? 10;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SectionHeader(eyebrow: 'Points', title: 'Leaderboard', subtitle: 'Every event you come to gives $per points and unlocks badges.'),
          const SizedBox(height: 14),
          if (_loading)
            const ShimmerList(count: 4, height: 70)
          else if (_error != null)
            ErrorState(message: _error!, onRetry: _load)
          else ...[
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final b in badges)
                Tag('${b['icon']} ${b['name']}', color: p.tech),
            ]),
            const SizedBox(height: 14),
            if (top.isEmpty)
              const EmptyState(icon: Icons.emoji_events_outlined, title: 'Nobody has points yet', message: 'Come to the next event and be the first!')
            else
              for (final x in top)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: GlassCard(
                    padding: const EdgeInsets.all(14),
                    child: Row(children: [
                      _Rank(rank: (x['rank'] as num?)?.toInt() ?? 0),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${x['name']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700, size: 15.5)),
                          const SizedBox(height: 2),
                          Text(
                            (x['badges'] is List && (x['badges'] as List).isNotEmpty) ? (x['badges'] as List).whereType<Map>().map((b) => '${b['icon']}').join(' ') : '${x['events']} ${tr('Events').toLowerCase()}',
                            style: bodyStyle(context, size: 16, color: p.muted),
                          ),
                        ]),
                      ),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text('${x['points']}', style: displayStyle(context, 26, color: p.accent)),
                        Text(tr('Points').toUpperCase(), style: monoStyle(context, size: 9)),
                      ]),
                    ]),
                  ),
                ),
          ],
        ],
      ),
    );
  }
}

class _Rank extends StatelessWidget {
  const _Rank({required this.rank});
  final int rank;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    const medal = [Color(0xFFFBBF24), Color(0xFFCBD5E1), Color(0xFFFB923C)];
    final top = rank >= 1 && rank <= 3;
    return Container(
      width: 42,
      height: 42,
      alignment: Alignment.center,
      decoration: BoxDecoration(shape: BoxShape.circle, color: top ? medal[rank - 1] : p.alt),
      child: top ? const Icon(Icons.military_tech_rounded, color: Colors.black87, size: 22) : Text('$rank', style: bodyStyle(context, weight: FontWeight.w700, color: p.muted)),
    );
  }
}
