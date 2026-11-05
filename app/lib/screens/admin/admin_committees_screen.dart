import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_widgets.dart';

class AdminCommitteesScreen extends StatefulWidget {
  const AdminCommitteesScreen({super.key});

  @override
  State<AdminCommitteesScreen> createState() => _AdminCommitteesScreenState();
}

class _AdminCommitteesScreenState extends State<AdminCommitteesScreen> {
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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await _state.api.committees();
      rows.sort((a, b) => sessionRank('${b['label']}').compareTo(sessionRank('${a['label']}')));
      if (mounted) setState(() => _rows = rows);
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _launch() async {
    final labels = _rows.map((r) => '${r['label']}').toList();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _LaunchSheet(sessions: labels),
    );
    if (ok == true) {
      if (mounted) showSnack(context, 'Committee launched');
      await _load();
      await _state.reloadMembers();
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _launch,
        backgroundColor: p.accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.rocket_launch_rounded),
        label: const Text('Launch new committee'),
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(children: [
                IconButton(onPressed: () => context.canPop() ? context.pop() : context.go('/admin'), icon: const Icon(Icons.arrow_back_rounded)),
                Expanded(child: Text('Committees', style: displayStyle(context, 24))),
                const AdminThemeButton(),
              ]),
            ),
            Expanded(
              child: RefreshIndicator(
                color: p.tech,
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 110),
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    if (_loading)
                      const ShimmerList(count: 3, height: 80)
                    else if (_error != null)
                      ErrorState(message: _error!, onRetry: _load)
                    else if (_rows.isEmpty)
                      const EmptyState(icon: Icons.groups_outlined, title: 'No committees yet')
                    else
                      for (var i = 0; i < _rows.length; i++)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: GlassCard(
                            padding: const EdgeInsets.all(16),
                            child: Row(children: [
                              Icon(Icons.groups_rounded, color: p.accent),
                              const SizedBox(width: 12),
                              Expanded(child: Text('${_rows[i]['label']}', style: bodyStyle(context, weight: FontWeight.w700, size: 16))),
                              if (i == 0) ...[const Tag('Current', color: Color(0xFF34D399)), const SizedBox(width: 8)],
                              Text('${_rows[i]['members']} members', style: monoStyle(context, size: 10.5)),
                            ]),
                          ).stagger(i),
                        ),
                  ],
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

class _LaunchSheet extends StatefulWidget {
  const _LaunchSheet({required this.sessions});
  final List<String> sessions;

  @override
  State<_LaunchSheet> createState() => _LaunchSheetState();
}

class _LaunchSheetState extends State<_LaunchSheet> {
  final _name = TextEditingController();
  late String _copyFrom = widget.sessions.isEmpty ? '' : widget.sessions.first;
  String _scope = 'none';
  String? _error;
  bool _busy = false;

  static const _scopes = {
    'none': 'Empty committee',
    'leaders': 'Copy leaders only',
    'all': 'Copy everyone',
  };

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _go() async {
    final name = _name.text.trim();
    if (name.length < 4) {
      setState(() => _error = 'Use a name like "Winter 2027"');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final state = context.read<AppState>();
    try {
      await state.api.launchCommittee(name, _scope == 'none' ? null : _copyFrom, _scope);
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      await state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Padding(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Launch new committee', style: displayStyle(context, 26)),
          const SizedBox(height: 4),
          Text('The newest semester becomes the current committee.', style: bodyStyle(context, color: p.muted, size: 13.5)),
          const SizedBox(height: 18),
          AppField(controller: _name, label: 'Session (e.g. Winter 2027)', error: _error, icon: Icons.calendar_today_rounded),
          const SizedBox(height: 14),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final e in _scopes.entries) PillChip(label: e.value, selected: _scope == e.key, onTap: () => setState(() => _scope = e.key)),
          ]),
          if (_scope != 'none' && widget.sessions.isNotEmpty) ...[
            const SizedBox(height: 14),
            PickerField(label: 'Copy from', value: _copyFrom, options: widget.sessions, icon: Icons.copy_rounded, onChanged: (v) => setState(() => _copyFrom = v)),
          ],
          const SizedBox(height: 20),
          GradientButton(label: 'Launch', icon: Icons.rocket_launch_rounded, loading: _busy, onPressed: _go),
        ]),
      ),
    );
  }
}
