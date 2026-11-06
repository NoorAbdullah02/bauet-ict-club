import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_page.dart';
import 'admin_widgets.dart';

/// Extra logins (editors can edit content and forms but cannot delete, see payments or backups). Main admin only.
class AdminTeamScreen extends StatefulWidget {
  const AdminTeamScreen({super.key});

  @override
  State<AdminTeamScreen> createState() => _AdminTeamScreenState();
}

class _AdminTeamScreenState extends State<AdminTeamScreen> {
  late final AppState _state = context.read<AppState>();
  final _user = TextEditingController();
  final _pass = TextEditingController();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _formError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _user.dispose();
    _pass.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final r = await _state.api.adminList('/team');
      if (mounted) setState(() => _rows = r);
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.status == 403 ? 'Only the main admin can manage logins.' : e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _add() async {
    setState(() {
      _busy = true;
      _formError = null;
    });
    try {
      await _state.api.adminCall('POST', '/team', data: {'username': _user.text.trim(), 'password': _pass.text});
      _user.clear();
      _pass.clear();
      if (mounted) showSnack(context, 'Editor login created');
      await _load();
    } on ApiException catch (e) {
      if (mounted) setState(() => _formError = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove(Map<String, dynamic> r) async {
    if (!await confirmAction(context, title: 'Remove ${r['username']}?', message: 'This login stops working at once.', confirmText: 'Remove', danger: true)) return;
    try {
      await _state.api.adminCall('DELETE', '/team/${r['id']}');
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return AdminPage(
      title: 'Team logins',
      onRefresh: _load,
      children: [
        if (_loading)
          const ShimmerList(count: 3, height: 70)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else ...[
          GlassCard(
            padding: const EdgeInsets.all(18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Add an editor', style: displayStyle(context, 18)),
              const SizedBox(height: 4),
              Text('Editors can edit events, notices and forms. They cannot delete, see payments or backups.', style: bodyStyle(context, size: 13, color: p.muted)),
              const SizedBox(height: 14),
              AppField(controller: _user, label: 'Username', icon: Icons.person_outline_rounded),
              const SizedBox(height: 12),
              AppField(controller: _pass, label: 'Password (12+ characters)', obscure: true, icon: Icons.lock_outline_rounded),
              if (_formError != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_formError!, style: bodyStyle(context, size: 13, color: const Color(0xFFEF4444)))),
              const SizedBox(height: 14),
              GradientButton(label: 'Create login', icon: Icons.person_add_alt_1_rounded, loading: _busy, onPressed: _busy ? null : _add),
            ]),
          ),
          const SizedBox(height: 18),
          Text('LOGINS', style: monoStyle(context)),
          const SizedBox(height: 10),
          for (final r in _rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: GlassCard(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  Icon(r['role'] == 'editor' ? Icons.edit_note_rounded : Icons.admin_panel_settings_rounded, color: p.accent),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${r['username']}', style: bodyStyle(context, weight: FontWeight.w700)),
                      Text('${r['role']}', style: monoStyle(context, size: 10.5, color: p.muted)),
                    ]),
                  ),
                  if (r['role'] == 'editor') IconButton(tooltip: 'Remove', onPressed: () => _remove(r), icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444))),
                ]),
              ),
            ),
        ],
      ],
    );
  }
}
