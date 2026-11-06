import '../../core/i18n.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import 'admin_page.dart';

/// Short links (/s/code) for events and forms, like forms.gle. Optional custom name; the click count is shown after you make one.
class AdminLinksScreen extends StatefulWidget {
  const AdminLinksScreen({super.key});

  @override
  State<AdminLinksScreen> createState() => _AdminLinksScreenState();
}

class _AdminLinksScreenState extends State<AdminLinksScreen> {
  late final AppState _state = context.read<AppState>();
  List<Map<String, dynamic>> _forms = [];
  bool _loading = true;
  final Map<String, String> _made = {}; // path -> short link

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final f = await _state.api.adminList('/forms');
      if (mounted) setState(() => _forms = f);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _make(String path, String name) async {
    final c = TextEditingController();
    final alias = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Short link for $name'),
        content: TextField(controller: c, decoration: const InputDecoration(labelText: 'Custom name (optional)', hintText: 'python-workshop')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr('Cancel'))),
          FilledButton(onPressed: () => Navigator.pop(ctx, c.text.trim().toLowerCase()), child: const Text('Make link')),
        ],
      ),
    );
    c.dispose();
    if (alias == null) return;
    try {
      final r = await _state.api.adminCall('POST', '/short', data: {'path': path, if (alias.isNotEmpty) 'alias': alias});
      final code = r is Map ? '${r['code']}' : '';
      if (code.isEmpty) return;
      final url = '${AppConfig.origin}/s/$code';
      await Clipboard.setData(ClipboardData(text: url));
      if (!mounted) return;
      setState(() => _made[path] = url);
      showSnack(context, 'Copied $url');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Widget _row(String path, String title, String sub) {
    final p = context.pal;
    final made = _made[path];
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GlassCard(
        padding: const EdgeInsets.all(14),
        onTap: () => _make(path, title),
        child: Row(children: [
          Icon(Icons.link_rounded, color: p.accent),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700)),
              Text(made ?? sub, style: monoStyle(context, size: 11, color: made == null ? p.muted : p.tech)),
            ]),
          ),
          Icon(Icons.chevron_right_rounded, color: p.muted),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final events = [..._state.events]..sort((a, b) => (b.date ?? DateTime(2000)).compareTo(a.date ?? DateTime(2000)));
    return AdminPage(
      title: 'Short links',
      children: [
        Text('Tap an item to make a short, shareable link. It is copied for you.', style: bodyStyle(context, size: 13, color: context.pal.muted)),
        const SizedBox(height: 14),
        Text('EVENTS', style: monoStyle(context)),
        const SizedBox(height: 10),
        if (events.isEmpty) const Text('No events yet.'),
        for (final e in events) _row('/events/${e.id}', e.title, '/events/${e.id}'),
        const SizedBox(height: 14),
        Text('FORMS', style: monoStyle(context)),
        const SizedBox(height: 10),
        if (_loading)
          const ShimmerList(count: 2, height: 70)
        else if (_forms.isEmpty)
          const Text('No forms yet.'),
        for (final f in _forms) _row('/f/${f['slug']}', '${f['title']}', '/f/${f['slug']}'),
      ],
    );
  }
}
