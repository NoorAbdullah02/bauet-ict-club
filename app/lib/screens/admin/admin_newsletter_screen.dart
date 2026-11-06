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

/// Send a newsletter to every subscriber (or a test copy to one address).
class AdminNewsletterScreen extends StatefulWidget {
  const AdminNewsletterScreen({super.key});

  @override
  State<AdminNewsletterScreen> createState() => _AdminNewsletterScreenState();
}

class _AdminNewsletterScreenState extends State<AdminNewsletterScreen> {
  late final AppState _state = context.read<AppState>();
  final _subject = TextEditingController();
  final _message = TextEditingController();
  final _test = TextEditingController();
  int? _subs;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _count();
  }

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    _test.dispose();
    super.dispose();
  }

  Future<void> _count() async {
    try {
      final r = await _state.api.adminList('/subscribers');
      if (mounted) setState(() => _subs = r.length);
    } on ApiException {
      // the number is a nicety
    }
  }

  Future<void> _send({required bool test}) async {
    if (test && !validEmail(_test.text.trim())) {
      setState(() => _error = 'Type a valid email for the test copy');
      return;
    }
    if (!test) {
      final ok = await confirmAction(context, title: 'Send to everyone?', message: 'This emails ${_subs ?? 'all'} subscribers and cannot be undone.', confirmText: 'Send');
      if (!ok) return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = await _state.api.adminCall('POST', '/email/newsletter', data: {
        'subject': _subject.text.trim(),
        'message': _message.text.trim(),
        if (test) 'testTo': _test.text.trim(),
      });
      if (mounted) showSnack(context, test ? 'Test copy sent' : 'Queued for ${r is Map ? r['queued'] : '?'} subscribers');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return AdminPage(
      title: 'Newsletter',
      children: [
        GlassCard(
          padding: const EdgeInsets.all(18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_subs == null ? 'Send to your subscribers' : '${_subs!} subscribers', style: displayStyle(context, 20)),
            const SizedBox(height: 4),
            Text('Every mail has its own unsubscribe link. Send yourself a test first.', style: bodyStyle(context, size: 13, color: p.muted)),
            const SizedBox(height: 14),
            AppField(controller: _subject, label: 'Subject', icon: Icons.title_rounded, maxLength: 150),
            const SizedBox(height: 12),
            AppField(controller: _message, label: 'Message', maxLines: 8, maxLength: 8000),
            const SizedBox(height: 12),
            AppField(controller: _test, label: 'Test email address', keyboard: TextInputType.emailAddress, icon: Icons.mail_outline_rounded),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: bodyStyle(context, size: 13, color: const Color(0xFFEF4444)))),
            const SizedBox(height: 14),
            GhostButton(label: 'Send test copy', icon: Icons.science_rounded, onPressed: _busy ? null : () => _send(test: true)),
            const SizedBox(height: 10),
            GradientButton(label: 'Send to everyone', icon: Icons.send_rounded, loading: _busy, onPressed: _busy ? null : () => _send(test: false)),
          ]),
        ),
      ],
    );
  }
}
