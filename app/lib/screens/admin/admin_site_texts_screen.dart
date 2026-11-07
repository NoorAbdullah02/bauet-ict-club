import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_page.dart';

/// The words on the home and about pages and the contact links: the same editor the website admin has under Settings.
class AdminSiteTextsScreen extends StatefulWidget {
  const AdminSiteTextsScreen({super.key});

  @override
  State<AdminSiteTextsScreen> createState() => _AdminSiteTextsScreenState();
}

class _AdminSiteTextsScreenState extends State<AdminSiteTextsScreen> {
  late final AppState _state = context.read<AppState>();
  static const _texts = [
    ('heroTitle', 'Hero title', false),
    ('heroSub', 'Hero subtitle', false),
    ('aboutText', 'About text', true),
    ('mission', 'Mission', true),
    ('vision', 'Vision', true),
    ('goal', 'Goal', true),
  ];
  static const _links = [('fb', 'Facebook link', Icons.facebook_rounded), ('email', 'E-mail', Icons.mail_outline_rounded), ('phone', 'Phone', Icons.phone_outlined), ('website', 'Website', Icons.language_rounded)];
  final Map<String, TextEditingController> _c = {};
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    for (final t in _texts) {
      _c[t.$1] = TextEditingController();
    }
    for (final l in _links) {
      _c['social_${l.$1}'] = TextEditingController();
    }
    _load();
  }

  @override
  void dispose() {
    for (final c in _c.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final d = await _state.api.adminCall('GET', '/settings', query: {'_': DateTime.now().millisecondsSinceEpoch});
      final m = d is Map ? Map<String, dynamic>.from(d) : <String, dynamic>{};
      final soc = m['socialLinks'] is Map ? Map<String, dynamic>.from(m['socialLinks'] as Map) : <String, dynamic>{};
      for (final t in _texts) {
        _c[t.$1]!.text = '${m[t.$1] ?? ''}';
      }
      for (final l in _links) {
        _c['social_${l.$1}']!.text = '${soc[l.$1] ?? ''}';
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      final body = <String, dynamic>{
        for (final t in _texts) t.$1: _c[t.$1]!.text.trim(),
        'socialLinks': {for (final l in _links) l.$1: _c['social_${l.$1}']!.text.trim()},
      };
      await _state.api.adminCall('PUT', '/settings', data: body);
      if (!mounted) return;
      showSnack(context, 'Saved. The website and the app show it now.');
      await _state.loadAll(fresh: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return AdminPage(
      title: 'Site texts and links',
      onRefresh: _load,
      children: [
        if (_loading)
          const ShimmerList(count: 4, height: 80)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else ...[
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Words on the pages', style: bodyStyle(context, weight: FontWeight.w800)),
              const SizedBox(height: 12),
              for (final t in _texts) ...[
                AppField(controller: _c[t.$1]!, label: t.$2, icon: t.$3 ? Icons.notes_rounded : Icons.title_rounded, maxLines: t.$3 ? 5 : 1, keyboard: t.$3 ? TextInputType.multiline : null),
                const SizedBox(height: 12),
              ],
            ]),
          ),
          const SizedBox(height: 14),
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Contact and links', style: bodyStyle(context, weight: FontWeight.w800)),
              Text('Shown in the footer and on the Contact page.', style: bodyStyle(context, size: 12.5, color: p.muted)),
              const SizedBox(height: 12),
              for (final l in _links) ...[
                AppField(controller: _c['social_${l.$1}']!, label: l.$2, icon: l.$3, keyboard: l.$1 == 'email' ? TextInputType.emailAddress : (l.$1 == 'phone' ? TextInputType.phone : TextInputType.url)),
                const SizedBox(height: 12),
              ],
            ]),
          ),
          const SizedBox(height: 16),
          GradientButton(label: 'Save', icon: Icons.save_rounded, loading: _busy, onPressed: _save),
        ],
      ],
    );
  }
}
