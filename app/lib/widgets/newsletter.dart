import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import 'coder.dart';
import 'common.dart';
import 'form_widgets.dart';

/// Compact newsletter signup (home + FAQ).
class NewsletterBox extends StatefulWidget {
  const NewsletterBox({super.key});

  @override
  State<NewsletterBox> createState() => _NewsletterBoxState();
}

class _NewsletterBoxState extends State<NewsletterBox> {
  final _email = TextEditingController();
  String? _error;
  bool _busy = false;
  bool _done = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!validEmail(_email.text)) {
      HapticFeedback.lightImpact();
      setState(() => _error = 'Enter a valid email');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final api = context.read<AppState>().api;
    try {
      await api.subscribe(_email.text.trim().toLowerCase());
      if (mounted) setState(() => _done = true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.status == 429 ? 'Too many attempts. Try again later.' : e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GlassCard(
      padding: const EdgeInsets.all(16),
      radius: 22,
      child: _done
          ? Row(children: [
              Icon(Icons.mark_email_read_rounded, color: p.tech),
              const SizedBox(width: 12),
              Expanded(child: Text('// subscribed. See you in your inbox.', style: monoStyle(context, color: p.fg, size: 12))),
            ])
          : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const CodeLabel('newsletter'),
              const SizedBox(height: 6),
              Text('Events, workshops and club news in your inbox.', style: bodyStyle(context, color: p.muted, size: 13)),
              const SizedBox(height: 12),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: AppField(
                    controller: _email,
                    label: 'Email',
                    error: _error,
                    keyboard: TextInputType.emailAddress,
                    icon: Icons.alternate_email_rounded,
                    textInputAction: TextInputAction.send,
                    onSubmitted: _submit,
                    onChanged: () {
                      if (_error != null) setState(() => _error = null);
                    },
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  height: 54,
                  child: GradientButton(label: 'Join', expand: false, loading: _busy, onPressed: _submit),
                ),
              ]),
            ]),
    );
  }
}
