import '../../core/i18n.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/coder.dart';
import '../../widgets/common.dart';
import 'admin_widgets.dart';

class AdminTrashScreen extends StatefulWidget {
  const AdminTrashScreen({super.key});

  @override
  State<AdminTrashScreen> createState() => _AdminTrashScreenState();
}

class _AdminTrashScreenState extends State<AdminTrashScreen> {
  late final AppState _state = context.read<AppState>();
  List<Map<String, dynamic>> _items = [];
  int _retention = 30;
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
      final data = await _state.api.trash();
      if (!mounted) return;
      setState(() {
        _retention = int.tryParse('${data['retentionDays']}') ?? 30;
        _items = (data['items'] is List ? data['items'] as List : []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      });
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _act(Future<void> Function() fn, String ok) async {
    try {
      await fn();
      if (mounted) showSnack(context, ok);
      await _load();
      await _state.loadAll();
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<bool> _confirm(String title, String body, String action) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(tr('Cancel'))),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(action, style: const TextStyle(color: Color(0xFFEF4444)))),
        ],
      ),
    );
    return yes == true;
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Row(children: [
                IconButton(tooltip: tr('Back'), onPressed: () => context.canPop() ? context.pop() : context.go('/admin'), icon: const Icon(Icons.arrow_back_rounded)),
                Expanded(child: Text('Trash', style: displayStyle(context, 24))),
                const AdminThemeButton(),
                if (_items.isNotEmpty)
                  TextButton(
                    onPressed: () async {
                      if (await _confirm('Empty trash?', 'All ${_items.length} items will be deleted permanently.', 'Empty')) {
                        await _act(_state.api.emptyTrash, 'Trash emptied');
                      }
                    },
                    child: const Text('Empty'),
                  ),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
              child: Align(alignment: Alignment.centerLeft, child: CodeLabel('items are removed for good after $_retention days')),
            ),
            Expanded(
              child: RefreshIndicator(
                color: p.tech,
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    if (_loading)
                      const ShimmerList(count: 4, height: 80)
                    else if (_error != null)
                      ErrorState(message: _error!, onRetry: _load)
                    else if (_items.isEmpty)
                      const EmptyState(icon: Icons.delete_outline_rounded, title: 'Trash is empty')
                    else
                      for (var i = 0; i < _items.length; i++) _tile(_items[i], p).stagger(i),
                  ],
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _tile(Map<String, dynamic> it, Pal p) {
    final type = (it['type'] ?? '').toString();
    final id = int.tryParse('${it['id']}') ?? 0;
    final image = (it['image'] ?? '').toString();
    final title = (it['title'] ?? '').toString();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          ClipRRect(borderRadius: BorderRadius.circular(14), child: SizedBox(width: 52, height: 52, child: NetImage(AppConfig.resolve(image), fallbackLabel: title))),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Tag((it['label'] ?? type).toString(), color: p.tech),
              const SizedBox(height: 4),
              Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700)),
              if ((it['sub'] ?? '').toString().isNotEmpty) Text(it['sub'].toString(), maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12, color: p.muted)),
              Text('deleted ${fmtDate(DateTime.tryParse('${it['deleted_at']}')?.toLocal())}', style: monoStyle(context, size: 9.5)),
            ]),
          ),
          IconButton(tooltip: 'Restore', onPressed: () => _act(() => _state.api.restoreTrash(type, id), 'Restored'), icon: Icon(Icons.restore_rounded, color: p.tech)),
          IconButton(
            tooltip: 'Delete forever',
            onPressed: () async {
              if (await _confirm('Delete forever?', '"$title" cannot be recovered.', 'Delete')) {
                await _act(() => _state.api.purgeTrash(type, id), 'Deleted permanently');
              }
            },
            icon: const Icon(Icons.delete_forever_rounded, color: Color(0xFFEF4444)),
          ),
        ]),
      ),
    );
  }
}
