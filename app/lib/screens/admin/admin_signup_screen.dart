import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';

/// Create one of the (at most 3) admin accounts: user name, e-mail and password, then the 6-digit code that is e-mailed.
class AdminSignupScreen extends StatefulWidget {
  const AdminSignupScreen({super.key});

  @override
  State<AdminSignupScreen> createState() => _AdminSignupScreenState();
}

class _AdminSignupScreenState extends State<AdminSignupScreen> {
  final _user = TextEditingController();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  final _code = TextEditingController();
  int _step = 1;
  bool _busy = false;
  bool _show = false;
  String? _error;
  String? _note;

  @override
  void dispose() {
    _user.dispose();
    _email.dispose();
    _pass.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    if (_user.text.trim().isEmpty || _email.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _error = 'Fill in the user name, the e-mail and the password.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final msg = await context.read<AppState>().api.signupStart(_user.text.trim(), _email.text.trim(), _pass.text);
      if (mounted) {
        setState(() {
          _note = msg;
          _step = 2;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    if (_code.text.trim().length < 6) {
      setState(() => _error = 'Type the 6-digit code from the e-mail.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    final st = context.read<AppState>();
    try {
      await st.api.signupVerify(_email.text.trim(), _code.text.trim());
      // the account exists: sign in with it at once (the router then opens the admin area)
      try {
        await st.login(_user.text.trim(), _pass.text);
      } catch (_) {
        if (mounted) context.go('/admin/login');
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
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
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(18, 8, 18, 24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton.filledTonal(onPressed: () => context.canPop() ? context.pop() : context.go('/admin/login'), icon: const Icon(Icons.arrow_back_rounded)),
              ),
              const SizedBox(height: 8),
              Text(_step == 1 ? 'Create your account' : 'Check your e-mail', textAlign: TextAlign.center, style: displayStyle(context, 28)),
              const SizedBox(height: 6),
              Text(_step == 1 ? 'Only 3 admin accounts can be made. Your e-mail is checked with a code.' : (_note ?? ''), textAlign: TextAlign.center, style: bodyStyle(context, color: p.muted)),
              const SizedBox(height: 18),
              GlassCard(
                padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  if (_step == 1) ...[
                    AppField(controller: _user, label: 'User name', icon: Icons.person_outline_rounded, textInputAction: TextInputAction.next, hint: '3 to 30 letters or numbers'),
                    const SizedBox(height: 14),
                    AppField(controller: _email, label: 'E-mail', icon: Icons.mail_outline_rounded, keyboard: TextInputType.emailAddress, textInputAction: TextInputAction.next, hint: 'you@gmail.com'),
                    const SizedBox(height: 14),
                    AppField(
                      controller: _pass,
                      label: 'Password',
                      icon: Icons.lock_outline_rounded,
                      obscure: !_show,
                      textInputAction: TextInputAction.done,
                      onSubmitted: _start,
                      hint: '6+ characters, letters and numbers',
                      suffix: IconButton(onPressed: () => setState(() => _show = !_show), icon: Icon(_show ? Icons.visibility_off_rounded : Icons.visibility_rounded, size: 20, color: p.muted)),
                    ),
                  ] else
                    AppField(controller: _code, label: '6-digit code', icon: Icons.shield_outlined, keyboard: TextInputType.number, maxLength: 6, textInputAction: TextInputAction.done, onSubmitted: _verify),
                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), color: const Color(0xFFEF4444).withValues(alpha: 0.1), border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.35))),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Icon(Icons.error_outline_rounded, size: 18, color: Color(0xFFEF4444)),
                        const SizedBox(width: 10),
                        Expanded(child: Text(_error!, style: bodyStyle(context, size: 13, color: const Color(0xFFB91C1C), weight: FontWeight.w600))),
                      ]),
                    ),
                  ],
                  const SizedBox(height: 18),
                  if (_step == 1)
                    GradientButton(label: 'Send me the code', icon: Icons.mark_email_unread_rounded, loading: _busy, onPressed: _start)
                  else ...[
                    GradientButton(label: 'Create my account', icon: Icons.check_circle_rounded, loading: _busy, onPressed: _verify),
                    TextButton(onPressed: () => setState(() {
                          _step = 1;
                          _error = null;
                        }), child: const Text('Wrong e-mail? Go back')),
                  ],
                ]),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}
