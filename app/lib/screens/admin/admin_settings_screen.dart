import '../../core/i18n.dart';
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
  Map<String, dynamic> _mail = {};
  Map<String, dynamic> _ai = {};
  Map<String, dynamic> _img = {};
  bool _statusLoaded = false;

  @override
  void initState() {
    super.initState();
    _load();
    _loadStatus();
  }

  /// Is email (Brevo), the AI assistant and picture storage connected? Same checks as the website's Settings page.
  Future<void> _loadStatus() async {
    Future<Map<String, dynamic>> safe(String path) async {
      try {
        return await _state.api.serviceStatus(path);
      } on ApiException catch (_) {
        return {};
      }
    }

    final r = await Future.wait([safe('email/status'), safe('chat/status'), safe('upload/status')]);
    if (!mounted) return;
    setState(() {
      _mail = r[0];
      _ai = r[1];
      _img = r[2];
      _statusLoaded = true;
    });
  }

  Future<void> _load() async {
    try {
      final c = await _state.api.demoCount();
      if (mounted) {
        setState(() {
          _count = c;
          _error = null;
        });
      }
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
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(tr('Cancel'))),
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
                    const CodeLabel('connections'),
                    const SizedBox(height: 10),
                    if (!_statusLoaded)
                      Text('checking...', style: monoStyle(context, color: p.tech, size: 12))
                    else ...[
                      _StatusRow(
                        ok: _mail['configured'] == true && ((_mail['check'] as Map?)?['ok'] != false),
                        title: _mail['configured'] == true ? 'Email via ${(_mail['provider'] ?? '').toString().toUpperCase()}' : 'Email not set up',
                        detail: _mail['configured'] == true
                            ? 'From ${_mail['from']}. Sent ${_mail['sent']}, failed ${_mail['failed']}.${(_mail['check'] as Map?)?['ok'] == false ? ' ${(_mail['check'] as Map)['error']}' : ''}'
                            : 'Add BREVO_API_KEY and MAIL_FROM to the server .env.',
                      ),
                      _StatusRow(
                        ok: _ai['configured'] == true,
                        title: _ai['configured'] == true ? 'AI assistant on (${_ai['model']})' : 'AI assistant uses built-in answers',
                        detail: _ai['configured'] == true ? 'Answered ${_ai['ok']}, fell back ${_ai['failed']}.' : 'Add GROQ_API_KEY to the server .env for full AI answers.',
                      ),
                      _StatusRow(
                        ok: _img['provider'] == 'cloudinary' && _img['ok'] == true,
                        title: _img['provider'] == 'cloudinary' ? 'Pictures on Cloudinary' : 'Pictures saved on the server',
                        detail: _img['provider'] == 'cloudinary' ? 'Optimised and removed from Cloudinary when deleted for good.' : 'Add CLOUDINARY_* keys to the server .env.',
                      ),
                    ],
                  ]),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 12, 8, 0),
                child: GlassCard(
                  padding: const EdgeInsets.all(18),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const CodeLabel('demo data'),
                    const SizedBox(height: 10),
                    Text('Fill every section (events, notices, gallery, posts, projects, committee, applications, messages) with illustrated sample content to preview the site. Demo subscribers never get email.', style: bodyStyle(context, color: p.muted, size: 13.5)),
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


class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.ok, required this.title, required this.detail});
  final bool ok;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(ok ? Icons.check_circle_rounded : Icons.warning_amber_rounded, size: 20, color: ok ? const Color(0xFF34D399) : const Color(0xFFFFC857)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: bodyStyle(context, weight: FontWeight.w700, size: 14)),
            const SizedBox(height: 2),
            Text(detail, style: bodyStyle(context, color: p.muted, size: 12.5)),
          ]),
        ),
      ]),
    );
  }
}
