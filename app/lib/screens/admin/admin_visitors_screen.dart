import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/charts.dart';
import '../../widgets/common.dart';
import 'admin_widgets.dart';

/// Admin → Visitors: people who opened the website today and this week, week by week, and the IP of every visitor.
class AdminVisitorsScreen extends StatefulWidget {
  const AdminVisitorsScreen({super.key});

  @override
  State<AdminVisitorsScreen> createState() => _AdminVisitorsScreenState();
}

class _AdminVisitorsScreenState extends State<AdminVisitorsScreen> {
  late final AppState _state = context.read<AppState>();
  Map<String, dynamic>? _summary;
  List<Map<String, dynamic>> _visitors = [];
  int _days = 7;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final s = await _state.api.serviceStatus('analytics/summary?weeks=8');
      final v = await _state.api.serviceStatus('analytics/visitors?days=$_days');
      if (!mounted) return;
      setState(() {
        _summary = s;
        _visitors = ((v['visitors'] as List?) ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      });
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int _n(Map<String, dynamic>? m, String k) => (m?[k] is num) ? (m![k] as num).toInt() : 0;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final s = _summary;
    final today = s?['today'] as Map<String, dynamic>?;
    final week = s?['thisWeek'] as Map<String, dynamic>?;
    final last = s?['lastWeek'] as Map<String, dynamic>?;
    final weekly = ((s?['weekly'] as List?) ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList().reversed.toList();

    Widget stat(String label, int v, IconData icon, Color c, [String? sub]) => Expanded(
          child: GlassCard(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(icon, color: c, size: 20),
              const SizedBox(height: 8),
              Text('$v', style: displayStyle(context, 28)),
              Text(label.toUpperCase(), style: monoStyle(context, size: 9.5)),
              if (sub != null) Text(sub, style: bodyStyle(context, size: 11, color: p.muted)),
            ]),
          ),
        );

    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _load,
            color: p.tech,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 40),
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                Row(children: [
                  IconButton(onPressed: () => context.canPop() ? context.pop() : context.go('/admin'), icon: const Icon(Icons.arrow_back_rounded)),
                  Expanded(child: Text('Visitors', style: displayStyle(context, 24))),
                  const AdminThemeButton(),
                  IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
                ]),
                if (_loading)
                  const Padding(padding: EdgeInsets.all(8), child: ShimmerList(count: 3, height: 90))
                else if (_error != null)
                  ErrorState(message: _error!, onRetry: _load)
                else ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
                    child: Row(children: [
                      stat('Today', _n(today, 'visitors'), Icons.people_alt_rounded, p.tech, '${_n(today, 'views')} page views'),
                      const SizedBox(width: 10),
                      stat('This week', _n(week, 'visitors'), Icons.calendar_view_week_rounded, p.accent, 'last week ${_n(last, 'visitors')}'),
                    ]),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 12, 8, 0),
                    child: GlassCard(
                      padding: const EdgeInsets.all(16),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('WEEK BY WEEK', style: monoStyle(context, size: 10, color: p.tech)),
                        const SizedBox(height: 8),
                        BarList(items: [for (var i = 0; i < weekly.length && i < 6; i++) ChartSlice((weekly[i]['weekStart'] ?? '').toString().length >= 10 ? (weekly[i]['weekStart'] as String).substring(5) : '', _n(weekly[i], 'visitors'), kChartColors[i % kChartColors.length])], color: p.tech),
                        const SizedBox(height: 8),
                        for (final w in weekly)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(children: [
                              Expanded(child: Text('Week of ${w['weekStart']}', style: bodyStyle(context, size: 13, color: p.muted))),
                              Text('${w['visitors']} visitors', style: bodyStyle(context, size: 13, weight: FontWeight.w700)),
                              const SizedBox(width: 12),
                              Text('${w['views']} views', style: bodyStyle(context, size: 12.5, color: p.muted)),
                            ]),
                          ),
                      ]),
                    ),
                  ),
                  if (((s?['devices'] as List?) ?? []).isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(8, 12, 8, 0),
                      child: GlassCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('DEVICES', style: monoStyle(context, size: 10, color: p.tech)),
                          const SizedBox(height: 10),
                          Center(
                            child: DonutChart(
                              centerLabel: 'VIEWS',
                              slices: [
                                for (final (i, d) in ((s?['devices'] as List?) ?? []).indexed)
                                  ChartSlice((d as Map)['name'].toString(), (d['views'] as num?) ?? 0, kChartColors[i % kChartColors.length]),
                              ],
                            ),
                          ),
                        ]),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 16, 8, 8),
                    child: Row(children: [
                      Expanded(child: Text('VISITOR IP ADDRESSES', style: monoStyle(context, size: 10, color: p.tech))),
                      for (final d in const [1, 7, 30])
                        Padding(
                          padding: const EdgeInsets.only(left: 6),
                          child: PillChip(
                            label: d == 1 ? 'Today' : '$d days',
                            selected: _days == d,
                            onTap: () {
                              setState(() => _days = d);
                              _load();
                            },
                          ),
                        ),
                    ]),
                  ),
                  if (_visitors.isEmpty)
                    const EmptyState(icon: Icons.public_rounded, title: 'No visitors in this period')
                  else
                    for (final v in _visitors.take(200))
                      Padding(
                        padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                        child: GlassCard(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          child: Row(children: [
                            Icon(v['device'] == 'Desktop' ? Icons.computer_rounded : Icons.smartphone_rounded, size: 18, color: p.tech),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text('${v['ip']}', style: monoStyle(context, size: 12.5, color: p.fg, weight: FontWeight.w700)),
                                Text('${v['topPage']} · ${(v['referrer'] ?? '').toString().isEmpty ? 'Direct' : v['referrer']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12, color: p.muted)),
                              ]),
                            ),
                            Text('${v['views']}×', style: bodyStyle(context, weight: FontWeight.w800)),
                          ]),
                        ),
                      ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
