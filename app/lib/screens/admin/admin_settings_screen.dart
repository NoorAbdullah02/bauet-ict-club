import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/coder.dart';
import '../../widgets/common.dart';
import 'admin_widgets.dart';

/// Admin settings: demo data loader / remover.
class AdminSettingsScreen extends StatefulWidget {
  const AdminSettingsScreen({super.key});

  @override
  State<AdminSettingsScreen> createState() => _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends State<AdminSettingsScreen> {
  late final AppState _state = context.read<AppState>();
  int? _count;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final c = await _state.api.demoCount();
      if (mounted) setState(() {
        _count = c;
        _error = null;
      });
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _run(Future<void> Function() fn, String ok) async {
    setState(() => _busy = true);
    try {
      await fn();
      if (mounted) showSnack(context, ok);
      await _load();
      await _state.loadAll();
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove demo data?'),
        content: const Text('Only the demo rows are deleted. Your real data stays.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remove', style: TextStyle(color: Color(0xFFEF4444)))),
        ],
      ),
    );
    if (yes == true) await _run(_state.api.removeDemo, 'Demo data removed');
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 40),
            children: [
              Row(children: [
                IconButton(onPressed: () => context.canPop() ? context.pop() : context.go('/admin'), icon: const Icon(Icons.arrow_back_rounded)),
                Expanded(child: Text('Settings', style: displayStyle(context, 24))),
                const AdminThemeButton(),
              ]),
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 12, 8, 0),
                child: GlassCard(
                  padding: const EdgeInsets.all(18),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const CodeLabel('demo data'),
                    const SizedBox(height: 10),
                    Text('Load a sample Winter 2026 committee, ambassadors, events, notices, awards and applications to preview the site.', style: bodyStyle(context, color: p.muted, size: 13.5)),
                    const SizedBox(height: 12),
                    if (_error != null)
                      Text('error: $_error', style: monoStyle(context, color: const Color(0xFFEF4444), size: 11.5))
                    else
                      Text(_count == null ? 'checking...' : '$_count demo rows loaded', style: monoStyle(context, color: p.tech, size: 12)),
                    const SizedBox(height: 16),
                    GradientButton(label: 'Load demo data', icon: Icons.download_rounded, loading: _busy, onPressed: (_count ?? 0) > 0 ? null : () => _run(_state.api.loadDemo, 'Demo data loaded')),
                    const SizedBox(height: 10),
                    GhostButton(label: 'Remove demo data', icon: Icons.delete_sweep_outlined, onPressed: (_count ?? 0) > 0 && !_busy ? _remove : null),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
