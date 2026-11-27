import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/downloads.dart';
import '../../core/theme.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import 'admin_page.dart';
import 'admin_widgets.dart';

/// Admin → Downloads: every list the club keeps, as CSV, Excel or JSON, with the phone's share sheet.
class AdminDownloadsScreen extends StatefulWidget {
  const AdminDownloadsScreen({super.key});

  @override
  State<AdminDownloadsScreen> createState() => _AdminDownloadsScreenState();
}

class _AdminDownloadsScreenState extends State<AdminDownloadsScreen> {
  late final AppState _state = context.read<AppState>();
  final TextEditingController _q = TextEditingController();
  List<Map<String, dynamic>>? _rows;
  String? _error;
  String _query = '';

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  static const _groups = ['People', 'Events', 'Forms', 'Content', 'System'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final r = await _state.api.adminList('/downloads');
      if (mounted) {
        setState(() => _rows = r);
      }
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) {
        setState(() {
          _rows = const [];
          _error = e.message;
        });
      }
    }
  }

  String get _day => DateTime.now().toIso8601String().substring(0, 10);

  void _get(Map<String, dynamic> row, String format) {
    final key = '${row['key']}';
    downloadAndShare(context, _state.api, '/downloads/$key', 'bauet-ict-$key-$_day.$format', query: {'format': format});
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final rows = _rows;
    final total = (rows ?? []).fold<int>(0, (n, r) => n + ((r['count'] is num) ? (r['count'] as num).toInt() : 0));

    return AdminPage(
      title: 'Downloads',
      onRefresh: _load,
      children: [
        Text(
          'Every list the club keeps — CSV, Excel or JSON. $total rows in total.',
          style: bodyStyle(context, size: 13, color: p.muted),
        ),
        if (rows != null && rows.isNotEmpty) ...[
          const SizedBox(height: 12),
          AdminSearchBar(
            controller: _q,
            hint: 'Search exports by list name or group…',
            onChanged: (v) => setState(() => _query = v),
            shown: rows.where((r) => matchesQuery(_query, [r['label'], r['key'], r['group'], r['note']])).length,
            total: rows.length,
          ),
        ],
        const SizedBox(height: 14),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: ErrorState(message: _error!, onRetry: _load),
          ),
        if (rows == null)
          const ShimmerList(count: 4, height: 76)
        else
          for (final filteredRows in [rows.where((r) => matchesQuery(_query, [r['label'], r['key'], r['group'], r['note']])).toList()])
            if (filteredRows.isEmpty)
              const EmptyState(icon: Icons.search_off_rounded, title: 'No matching exports')
            else
              for (final g in _groups)
                if (filteredRows.any((r) => r['group'] == g)) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 10, 4, 8),
                    child: Text(g.toString().toUpperCase(), style: monoStyle(context, size: 10, color: p.tech)),
                  ),
                  GlassCard(
                    padding: EdgeInsets.zero,
                    child: Column(children: [
                      for (final (i, r) in filteredRows.where((r) => r['group'] == g).indexed) ...[
                        if (i > 0) Divider(height: 1, color: p.line),
                        _Row(row: r, onGet: (f) => _get(r, f)),
                      ],
                    ]),
                  ),
                ],
        const SizedBox(height: 16),
        GlassCard(
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(Icons.lock_outline_rounded, size: 18, color: p.muted),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'These files hold personal data (names, e-mails, phone numbers, payments). Keep them on the club’s own computer and delete them when the work is done.',
                style: bodyStyle(context, size: 12, color: p.muted),
              ),
            ),
          ]),
        ),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.row, required this.onGet});
  final Map<String, dynamic> row;
  final void Function(String format) onGet;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final count = (row['count'] is num) ? (row['count'] as num).toInt() : 0;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text('${row['label'] ?? row['key']}', style: bodyStyle(context, size: 14, weight: FontWeight.w700))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: count > 0 ? p.accent.withValues(alpha: 0.12) : p.alt, borderRadius: BorderRadius.circular(999)),
            child: Text('$count', style: monoStyle(context, size: 10, color: count > 0 ? p.accent : p.muted)),
          ),
        ]),
        if ((row['note'] ?? '').toString().isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text('${row['note']}', style: bodyStyle(context, size: 11.5, color: p.muted)),
          ),
        const SizedBox(height: 8),
        Row(children: [
          for (final f in const ['csv', 'xlsx', 'json']) ...[
            Expanded(
              child: OutlinedButton(
                onPressed: count > 0 ? () => onGet(f) : null,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  side: BorderSide(color: p.line),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  foregroundColor: p.fg,
                ),
                child: Text(f == 'xlsx' ? 'EXCEL' : f.toUpperCase(), style: monoStyle(context, size: 10, color: p.fg)),
              ),
            ),
            if (f != 'json') const SizedBox(width: 6),
          ],
        ]),
      ]),
    );
  }
}
