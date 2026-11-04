import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/form_widgets.dart';

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _subject = TextEditingController();
  final _message = TextEditingController();
  final Map<String, String> _errors = {};
  bool _busy = false;
  bool _sent = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final e = <String, String>{};
    if (_name.text.trim().length < 2) e['name'] = 'Enter your name';
    if (!validEmail(_email.text)) e['email'] = 'Enter a valid email';
    if (_message.text.trim().length < 5) e['message'] = 'Write a short message';
    setState(() {
      _errors
        ..clear()
        ..addAll(e);
    });
    if (e.isNotEmpty) {
      HapticFeedback.lightImpact();
      return;
    }
    setState(() => _busy = true);
    try {
      await context.read<AppState>().api.sendMessage({
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'subject': _subject.text.trim(),
        'message': _message.text.trim(),
      });
      if (!mounted) return;
      setState(() => _sent = true);
      _name.clear();
      _email.clear();
      _subject.clear();
      _message.clear();
    } on ApiException catch (ex) {
      if (mounted) showSnack(context, ex.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final s = context.watch<AppState>().settings;
    Widget action(IconData icon, String title, String value, VoidCallback onTap) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GlassCard(
            onTap: onTap,
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), color: p.accent.withValues(alpha: 0.15)),
                child: Icon(icon, color: p.accent, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title.toUpperCase(), style: monoStyle(context, size: 9.5)),
                  const SizedBox(height: 2),
                  Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w600)),
                ]),
              ),
              Icon(Icons.north_east_rounded, size: 16, color: p.muted),
            ]),
          ),
        );

    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: kPagePadding,
      children: [
        const SectionHeader(eyebrow: 'Say hello', title: 'Contact us', subtitle: 'Questions, ideas or collaborations - we reply fast.').stagger(0),
        const SizedBox(height: 20),
        if (s.email.isNotEmpty) action(Icons.mail_rounded, 'Email', s.email, () => openUrl(context, 'mailto:${s.email}')).stagger(1),
        if (s.phone.isNotEmpty) action(Icons.call_rounded, 'Phone', s.phone, () => openUrl(context, 'tel:${s.phone}')).stagger(2),
        if (s.fb.isNotEmpty) action(Icons.facebook_rounded, 'Facebook', s.fb, () => openUrl(context, normalizeLink(s.fb))).stagger(3),
        const SizedBox(height: 10),
        GlassCard(
          padding: const EdgeInsets.all(20),
          child: _sent
              ? Column(children: [
                  const SizedBox(height: 10),
                  Icon(Icons.mark_email_read_rounded, size: 52, color: p.tech),
                  const SizedBox(height: 12),
                  Text('Message sent!', style: displayStyle(context, 24)),
                  const SizedBox(height: 6),
                  Text('Thanks for reaching out. We will get back to you soon.', textAlign: TextAlign.center, style: bodyStyle(context, color: p.muted)),
                  const SizedBox(height: 16),
                  GhostButton(label: 'Send another', onPressed: () => setState(() => _sent = false)),
                ])
              : Column(children: [
                  AppField(controller: _name, label: 'Your name', error: _errors['name'], icon: Icons.person_outline_rounded, textInputAction: TextInputAction.next),
                  const SizedBox(height: 14),
                  AppField(controller: _email, label: 'Email', error: _errors['email'], keyboard: TextInputType.emailAddress, icon: Icons.alternate_email_rounded, textInputAction: TextInputAction.next),
                  const SizedBox(height: 14),
                  AppField(controller: _subject, label: 'Subject (optional)', icon: Icons.short_text_rounded, textInputAction: TextInputAction.next),
                  const SizedBox(height: 14),
                  AppField(controller: _message, label: 'Message', error: _errors['message'], maxLines: 5, keyboard: TextInputType.multiline),
                  const SizedBox(height: 18),
                  GradientButton(label: 'Send message', icon: Icons.send_rounded, loading: _busy, onPressed: _send),
                ]),
        ).stagger(4),
      ],
    );
  }
}
