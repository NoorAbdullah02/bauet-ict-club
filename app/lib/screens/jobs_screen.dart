import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/form_widgets.dart';

String _day(dynamic d) => d == null ? '' : d.toString().split('T').first;

/// Days left to apply: null = no deadline, negative = closed (Bangladesh date).
int? _daysLeft(dynamic deadline) {
  final d = DateTime.tryParse(_day(deadline));
  if (d == null) return null;
  final n = DateTime.now().toUtc().add(const Duration(hours: 6));
  return DateTime.utc(d.year, d.month, d.day).difference(DateTime.utc(n.year, n.month, n.day)).inDays;
}

/// The job and internship board: open positions first, closed ones last.
class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  late final AppState _state = context.read<AppState>();
  final _q = TextEditingController();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String? _error;
  String _kind = 'All';
  int? _open;
  bool _remoteTab = false;
  bool _openOnly = true;
  String _tag = '';
  List<Map<String, dynamic>> _remote = [];
  bool _remoteLoading = false;
  bool _remoteOn = true;
  String? _remoteError;
  static final _openRe = RegExp('worldwide|anywhere|global|asia|bangladesh|apac|any', caseSensitive: false);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _loadRemote() async {
    setState(() {
      _remoteLoading = true;
      _remoteError = null;
    });
    try {
      final d = await _state.api.remoteJobs();
      if (mounted) {
        setState(() {
          _remoteOn = d['enabled'] != false;
          _remote = d['jobs'] is List ? (d['jobs'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : [];
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _remoteError = e.message);
    } finally {
      if (mounted) setState(() => _remoteLoading = false);
    }
  }

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final r = await _state.api.list('jobs', fresh: true);
      if (mounted) setState(() => _rows = r);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _apply(Map<String, dynamic> j) async {
    final url = '${j['apply_url'] ?? ''}'.trim();
    final mail = '${j['apply_email'] ?? ''}'.trim();
    if (url.isNotEmpty) {
      await openUrl(context, url);
    } else if (mail.isNotEmpty) {
      await openUrl(context, 'mailto:$mail?subject=${Uri.encodeComponent('Application: ${j['title']}')}');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_remoteTab) return _remoteView(context);
    final p = context.pal;
    final kinds = ['All', ...{for (final r in _rows) if ('${r['kind'] ?? ''}'.isNotEmpty) '${r['kind']}'}];
    final q = _q.text.trim().toLowerCase();
    final list = _rows.where((r) {
      if (_kind != 'All' && '${r['kind']}' != _kind) return false;
      return q.isEmpty || '${r['title']} ${r['company']} ${r['location']} ${r['description']} ${r['kind']}'.toLowerCase().contains(q);
    }).toList()
      ..sort((a, b) {
        final ca = (_daysLeft(a['deadline']) ?? 999) < 0 ? 1 : 0;
        final cb = (_daysLeft(b['deadline']) ?? 999) < 0 ? 1 : 0;
        if (ca != cb) return ca - cb;
        final fa = a['featured'] == true ? 0 : 1;
        final fb = b['featured'] == true ? 0 : 1;
        return fa - fb;
      });
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Careers', title: 'Jobs and internships', subtitle: 'Openings shared by the club for BAUET students and alumni.'),
          const SizedBox(height: 14),
          _tabs(context),
          const SizedBox(height: 14),
          AppField(controller: _q, label: 'Search jobs', icon: Icons.search_rounded, onChanged: () => setState(() {})),
          if (kinds.length > 2) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 42,
              child: ListView(scrollDirection: Axis.horizontal, children: [
                for (final k in kinds) Padding(padding: const EdgeInsets.only(right: 10), child: PillChip(label: k, selected: _kind == k, onTap: () => setState(() => _kind = k))),
              ]),
            ),
          ],
          const SizedBox(height: 14),
          if (_loading)
            const ShimmerList(count: 3, height: 120)
          else if (_error != null)
            ErrorState(message: _error!, onRetry: _load)
          else if (list.isEmpty)
            EmptyState(icon: Icons.work_outline_rounded, title: _rows.isEmpty ? 'No openings right now' : 'Nothing matches', message: _rows.isEmpty ? 'Check back soon.' : 'Try another word.')
          else
            for (final j in list) _card(context, p, j),
        ],
      ),
    );
  }

  Widget _tabs(BuildContext context) => Row(children: [
        PillChip(label: 'Club openings', selected: !_remoteTab, onTap: () => setState(() => _remoteTab = false)),
        const SizedBox(width: 10),
        PillChip(
            label: 'Remote jobs',
            selected: _remoteTab,
            onTap: () {
              setState(() => _remoteTab = true);
              if (_remote.isEmpty && !_remoteLoading) _loadRemote();
            }),
      ]);

  /// Remote jobs from Remotive and Remote OK. Every card links back to the original page and names the source.
  Widget _remoteView(BuildContext context) {
    final p = context.pal;
    final tags = <String, int>{};
    for (final j in _remote) {
      for (final t in (j['tags'] is List ? j['tags'] as List : const [])) {
        tags['$t'] = (tags['$t'] ?? 0) + 1;
      }
    }
    final topTags = (tags.entries.toList()..sort((a, b) => b.value.compareTo(a.value))).take(10).map((e) => e.key).toList();
    final q = _q.text.trim().toLowerCase();
    final list = _remote.where((j) {
      if (_openOnly && !_openRe.hasMatch('${j['location'] ?? ''}')) return false;
      if (_tag.isNotEmpty && !((j['tags'] is List ? j['tags'] as List : const []).contains(_tag))) return false;
      return q.isEmpty || '${j['title']} ${j['company']} ${j['location']} ${(j['tags'] is List ? (j['tags'] as List).join(' ') : '')}'.toLowerCase().contains(q);
    }).take(80).toList();
    return RefreshIndicator(
      onRefresh: _loadRemote,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Careers', title: 'Jobs and internships', subtitle: 'Remote jobs from around the world. Tap Apply to open the original page.'),
          const SizedBox(height: 14),
          _tabs(context),
          const SizedBox(height: 14),
          AppField(controller: _q, label: 'Search remote jobs', icon: Icons.search_rounded, onChanged: () => setState(() {})),
          const SizedBox(height: 10),
          SwitchListTile(contentPadding: EdgeInsets.zero, title: Text('Open to Bangladesh', style: bodyStyle(context, weight: FontWeight.w600)), value: _openOnly, onChanged: (v) => setState(() => _openOnly = v)),
          if (topTags.isNotEmpty)
            SizedBox(
              height: 42,
              child: ListView(scrollDirection: Axis.horizontal, children: [
                for (final t in ['', ...topTags]) Padding(padding: const EdgeInsets.only(right: 10), child: PillChip(label: t.isEmpty ? 'All topics' : t, selected: _tag == t, onTap: () => setState(() => _tag = t))),
              ]),
            ),
          const SizedBox(height: 14),
          if (_remoteLoading && _remote.isEmpty)
            const ShimmerList(count: 4, height: 110)
          else if (_remoteError != null)
            ErrorState(message: _remoteError!, onRetry: _loadRemote)
          else if (!_remoteOn)
            const EmptyState(icon: Icons.public_off_rounded, title: 'Remote jobs are off', message: 'Not available right now.')
          else if (list.isEmpty)
            EmptyState(icon: Icons.public_rounded, title: _remote.isEmpty ? 'No remote jobs loaded yet' : 'Nothing matches', message: _remote.isEmpty ? 'Pull down to try again in a minute.' : 'Turn off "Open to Bangladesh" or try another word.')
          else
            for (final j in list)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassCard(
                  onTap: () => openUrl(context, '${j['url']}'),
                  padding: const EdgeInsets.all(14),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    if ('${j['logo'] ?? ''}'.startsWith('http'))
                      ClipRRect(borderRadius: BorderRadius.circular(14), child: SizedBox(width: 46, height: 46, child: NetImage('${j['logo']}', fit: BoxFit.contain)))
                    else
                      Container(width: 46, height: 46, decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), color: p.alt), child: Icon(Icons.business_rounded, color: p.muted)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Wrap(spacing: 6, runSpacing: 4, children: [
                          Tag('Remote', color: p.tech),
                          if (_openRe.hasMatch('${j['location'] ?? ''}')) const Tag('Open to Bangladesh', color: Color(0xFF10B981)),
                        ]),
                        const SizedBox(height: 6),
                        Text('${j['title']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w800, size: 15.5)),
                        Text('${j['company'] ?? ''}', style: bodyStyle(context, size: 13, color: p.muted)),
                        const SizedBox(height: 4),
                        _meta(context, Icons.public_rounded, '${j['location'] ?? 'Worldwide'}'),
                        if ('${j['salary'] ?? ''}'.isNotEmpty && j['salary'] != null) _meta(context, Icons.payments_outlined, '${j['salary']}'),
                        const SizedBox(height: 6),
                        Text('via ${j['source'] == 'remoteok' ? 'Remote OK' : 'Remotive'}', style: monoStyle(context, size: 9.5, color: p.muted)),
                      ]),
                    ),
                    Icon(Icons.open_in_new_rounded, size: 18, color: p.muted),
                  ]),
                ),
              ),
          const SizedBox(height: 10),
          Text('Remote jobs come from Remotive and Remote OK. The club does not run these jobs; check each employer before you apply.', textAlign: TextAlign.center, style: bodyStyle(context, size: 11.5, color: p.muted)),
        ],
      ),
    );
  }

  Widget _card(BuildContext context, Pal p, Map<String, dynamic> j) {
    final left = _daysLeft(j['deadline']);
    final closed = left != null && left < 0;
    final open = _open == (j['id'] as num).toInt();
    final canApply = '${j['apply_url'] ?? ''}'.trim().isNotEmpty || '${j['apply_email'] ?? ''}'.trim().isNotEmpty;
    final when = left == null
        ? ''
        : closed
            ? 'Closed ${fmtDate(DateTime.tryParse(_day(j['deadline'])))}'
            : left == 0
                ? 'Last day today'
                : left <= 7
                    ? '$left day${left == 1 ? '' : 's'} left'
                    : 'Apply before ${fmtDate(DateTime.tryParse(_day(j['deadline'])))}';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Opacity(
        opacity: closed ? 0.7 : 1,
        child: GlassCard(
          onTap: () => setState(() => _open = open ? null : (j['id'] as num).toInt()),
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if ('${j['image_url'] ?? ''}'.isNotEmpty)
                ClipRRect(borderRadius: BorderRadius.circular(14), child: SizedBox(width: 50, height: 50, child: NetImage('${j['image_url']}', fit: BoxFit.contain)))
              else
                Container(width: 50, height: 50, decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), color: p.alt), child: Icon(Icons.business_rounded, color: p.muted)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Wrap(spacing: 6, runSpacing: 4, children: [
                    Tag('${j['kind'] ?? 'Job'}', color: p.tech),
                    if (j['featured'] == true && !closed) const Tag('Featured', color: Color(0xFFF59E0B)),
                    if (closed) Tag('Closed', color: p.muted),
                  ]),
                  const SizedBox(height: 6),
                  Text('${j['title']}', style: bodyStyle(context, weight: FontWeight.w800, size: 16.5)),
                  Text([j['company'], j['work_mode']].where((x) => x != null && '$x'.isNotEmpty).join(' · '), style: bodyStyle(context, size: 13, color: p.muted)),
                  const SizedBox(height: 6),
                  if ('${j['location'] ?? ''}'.isNotEmpty) _meta(context, Icons.place_rounded, '${j['location']}'),
                  if ('${j['salary'] ?? ''}'.isNotEmpty) _meta(context, Icons.payments_outlined, '${j['salary']}'),
                  if (when.isNotEmpty) _meta(context, Icons.schedule_rounded, when),
                ]),
              ),
              Icon(open ? Icons.expand_less_rounded : Icons.expand_more_rounded, color: p.muted),
            ]),
            if (open) ...[
              const SizedBox(height: 12),
              Text('${j['description'] ?? ''}'.isEmpty ? 'No more details. Use the apply button to ask the company.' : '${j['description']}', style: bodyStyle(context, size: 13.5, color: p.muted)),
              if (!closed && canApply) ...[
                const SizedBox(height: 12),
                GradientButton(label: '${j['apply_url'] ?? ''}'.trim().isNotEmpty ? 'Apply now' : 'Apply by e-mail', icon: Icons.open_in_new_rounded, onPressed: () => _apply(j)),
              ],
            ],
          ]),
        ),
      ),
    );
  }

  Widget _meta(BuildContext context, IconData i, String t) => Padding(
        padding: const EdgeInsets.only(top: 2),
        child: Row(children: [Icon(i, size: 14, color: context.pal.tech), const SizedBox(width: 6), Expanded(child: Text(t, style: bodyStyle(context, size: 12.5, color: context.pal.muted)))]),
      );
}
