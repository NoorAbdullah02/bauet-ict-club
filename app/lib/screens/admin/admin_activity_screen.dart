import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import 'admin_page.dart';
import 'admin_widgets.dart';

/// Activity log: who changed what (main admin only).
class AdminActivityScreen extends StatefulWidget {
  const AdminActivityScreen({super.key});

  @override
  State<AdminActivityScreen> createState() => _AdminActivityScreenState();
}

class _AdminActivityScreenState extends State<AdminActivityScreen> {
  late final AppState _state = context.read<AppState>();
  final TextEditingController _q = TextEditingController();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final r = await _state.api.adminList('/audit');
      if (mounted) setState(() => _rows = r);
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.status == 403 ? 'Only the main admin can see the activity log.' : e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _tone(int s) => s >= 500 ? const Color(0xFFEF4444) : s >= 400 ? const Color(0xFFF59E0B) : const Color(0xFF10B981);

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final filtered = _rows.where((r) => matchesQuery(_query, [r['username'], r['method'], r['path'], r['status']])).toList();
    return AdminPage(
      title: 'Activity log',
      onRefresh: _load,
      children: [
        if (!_loading && _error == null && _rows.isNotEmpty) ...[
          AdminSearchBar(
            controller: _q,
            hint: 'Search admin, method, path, status…',
            onChanged: (v) => setState(() => _query = v),
            shown: filtered.length,
            total: _rows.length,
          ),
          const SizedBox(height: 12),
        ],
        if (_loading)
          const ShimmerList(count: 5, height: 70)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else if (_rows.isEmpty)
          const EmptyState(icon: Icons.history_rounded, title: 'Nothing yet', message: 'Changes made by admins show up here.')
        else if (filtered.isEmpty)
          const EmptyState(icon: Icons.search_off_rounded, title: 'No matching entries')
        else
          for (final r in filtered)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                padding: const EdgeInsets.all(12),
                child: Row(children: [
                  Container(
                    width: 46,
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    decoration: BoxDecoration(color: _tone(int.tryParse('${r['status']}') ?? 200).withValues(alpha: 0.14), borderRadius: BorderRadius.circular(8)),
                    child: Text('${r['status']}', textAlign: TextAlign.center, style: monoStyle(context, size: 11, color: _tone(int.tryParse('${r['status']}') ?? 200))),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${r['method']} ${r['path']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: monoStyle(context, size: 11.5, color: p.fg)),
                      Text('${r['username'] ?? '?'} · ${'${r['created_at']}'.replaceFirst('T', ' ').split('.').first}', style: bodyStyle(context, size: 12, color: p.muted)),
                    ]),
                  ),
                ]),
              ),
            ),
      ],
    );
  }
}
