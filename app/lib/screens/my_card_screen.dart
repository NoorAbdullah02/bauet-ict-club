import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/form_widgets.dart';
import 'event_detail_screen.dart' show PageTopBar;

/// A member who joined through the application form finds their own card with the e-mail and student ID they applied with.
class MyCardScreen extends StatefulWidget {
  const MyCardScreen({super.key});

  @override
  State<MyCardScreen> createState() => _MyCardScreenState();
}

class _MyCardScreenState extends State<MyCardScreen> {
  late final AppState _state = context.read<AppState>();
  final _email = TextEditingController();
  final _sid = TextEditingController();
  bool _busy = false;
  String? _msg;

  @override
  void dispose() {
    _email.dispose();
    _sid.dispose();
    super.dispose();
  }

  Future<void> _find() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final r =
          await _state.api.findMyCard(_email.text.trim(), _sid.text.trim());
      if (mounted) context.push('${r['path']}');
    } on ApiException catch (e) {
      if (mounted) setState(() => _msg = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            children: [
              const PageTopBar(title: 'My member card', fallback: '/home'),
              const SizedBox(height: 12),
              const SectionHeader(
                  eyebrow: 'Members',
                  title: 'My member card',
                  subtitle:
                      'Type the e-mail and student ID you used to join the club. Your card opens as soon as an admin has approved your application.'),
              const SizedBox(height: 16),
              GlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  AppField(
                      controller: _email,
                      label: 'Your e-mail',
                      icon: Icons.mail_outline_rounded,
                      keyboard: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next),
                  const SizedBox(height: 12),
                  AppField(
                      controller: _sid,
                      label: 'Student ID',
                      icon: Icons.badge_outlined,
                      textInputAction: TextInputAction.go,
                      onSubmitted: _find),
                  if (_msg != null) ...[
                    const SizedBox(height: 12),
                    Text(_msg!,
                        style: bodyStyle(context,
                            size: 13, color: const Color(0xFFB45309))),
                  ],
                  const SizedBox(height: 16),
                  GradientButton(
                      label: 'Show my card',
                      icon: Icons.badge_rounded,
                      loading: _busy,
                      onPressed: _find),
                ]),
              ),
              const SizedBox(height: 12),
              Text('Committee members find their card on the Team page.',
                  textAlign: TextAlign.center,
                  style: bodyStyle(context, size: 12.5, color: p.muted)),
            ],
          ),
        ),
      ),
    );
  }
}
