import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  bool get _ready => RegExp(r'^[A-Za-z0-9._-]{3,30}$').hasMatch(_user.text.trim()) && RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$').hasMatch(_email.text.trim()) && _PwScore(_pass.text, _user.text.trim()).ok;

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
                    AppField(controller: _user, label: 'User name', icon: Icons.person_outline_rounded, textInputAction: TextInputAction.next, hint: '3 to 30 letters or numbers', onChanged: () => setState(() {})),
                    const SizedBox(height: 14),
                    AppField(controller: _email, label: 'E-mail', icon: Icons.mail_outline_rounded, keyboard: TextInputType.emailAddress, textInputAction: TextInputAction.next, hint: 'you@gmail.com', onChanged: () => setState(() {})),
                    const SizedBox(height: 14),
                    AppField(
                      controller: _pass,
                      label: 'Password',
                      icon: Icons.lock_outline_rounded,
                      obscure: !_show,
                      textInputAction: TextInputAction.done,
                      onSubmitted: _start,
                      hint: '6+ characters, letters and numbers',
                      onChanged: () => setState(() {}),
                      suffix: IconButton(onPressed: () => setState(() => _show = !_show), icon: Icon(_show ? Icons.visibility_off_rounded : Icons.visibility_rounded, size: 20, color: p.muted)),
                    ),
                    _PwMeter(score: _PwScore(_pass.text, _user.text.trim())),
                  ] else
                    _CodeBoxes(controller: _code, onChanged: () => setState(() {}), onDone: _verify),
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
                    GradientButton(label: 'Send me the code', icon: Icons.mark_email_unread_rounded, loading: _busy, onPressed: _ready ? _start : null)
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

/// How strong a new password is. `ok` means it meets the club's rule; `level` is 1 weak, 2 medium, 3 strong.
class _PwScore {
  _PwScore(this.pw, this.user) {
    long = pw.length >= 6;
    mix = RegExp(r'[A-Za-z]').hasMatch(pw) && RegExp(r'[^A-Za-z]').hasMatch(pw);
    named = user.length >= 3 && pw.toLowerCase().contains(user.toLowerCase());
    easy = RegExp(r'^(.)\1+$').hasMatch(pw) || RegExp(r'^(123456|password|qwerty|abcdef)', caseSensitive: false).hasMatch(pw);
    ok = long && mix && !named && !easy;
    var pts = 0;
    if (pw.length >= 6) pts++;
    if (pw.length >= 10) pts++;
    if (RegExp(r'[a-z]').hasMatch(pw) && RegExp(r'[A-Z]').hasMatch(pw)) pts++;
    if (RegExp(r'\d').hasMatch(pw)) pts++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(pw)) pts++;
    level = !ok ? 0 : (pts >= 5 ? 3 : (pts >= 4 ? 2 : 1));
  }
  final String pw;
  final String user;
  bool long = false, mix = false, named = false, easy = false, ok = false;
  int level = 0;
}

class _PwMeter extends StatelessWidget {
  const _PwMeter({required this.score});
  final _PwScore score;

  @override
  Widget build(BuildContext context) {
    if (score.pw.isEmpty) return const SizedBox.shrink();
    final p = context.pal;
    final color = !score.ok ? const Color(0xFFEF4444) : (score.level == 1 ? const Color(0xFFF59E0B) : (score.level == 2 ? const Color(0xFF84CC16) : const Color(0xFF16A34A)));
    final label = !score.ok ? 'Not allowed yet' : ['', 'Weak', 'Medium', 'Strong'][score.level];
    Widget tip(bool v, String t) => Text('${v ? '✓' : '•'} $t', style: bodyStyle(context, size: 12, color: v ? const Color(0xFF16A34A) : p.muted));
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          for (var i = 1; i <= 3; i++)
            Expanded(child: Container(margin: EdgeInsets.only(right: i < 3 ? 6 : 0), height: 6, decoration: BoxDecoration(borderRadius: BorderRadius.circular(3), color: (score.ok && score.level >= i) || (!score.ok && i == 1) ? color : p.line))),
        ]),
        const SizedBox(height: 4),
        Text(label, style: bodyStyle(context, size: 12, color: color, weight: FontWeight.w700)),
        const SizedBox(height: 2),
        tip(score.long, '6 or more characters'),
        tip(score.mix, 'Letters together with numbers or symbols'),
        tip(!score.named && !score.easy, 'Not your user name, not a common word'),
      ]),
    );
  }
}

/// Six boxes for the e-mailed code. One hidden text field takes the typing and pasting; the boxes only show it.
class _CodeBoxes extends StatefulWidget {
  const _CodeBoxes({required this.controller, required this.onChanged, required this.onDone});
  final TextEditingController controller;
  final VoidCallback onChanged;
  final VoidCallback onDone;

  @override
  State<_CodeBoxes> createState() => _CodeBoxesState();
}

class _CodeBoxesState extends State<_CodeBoxes> {
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final text = widget.controller.text;
    final current = text.length > 5 ? 5 : text.length;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _focus.requestFocus(),
      child: Stack(children: [
        Row(children: [
          for (var i = 0; i < 6; i++)
            Expanded(
              child: Container(
                margin: EdgeInsets.only(right: i < 5 ? 8 : 0),
                height: 58,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: p.surface,
                  border: Border.all(color: _focus.hasFocus && i == current ? p.accent : (i < text.length ? p.accent.withValues(alpha: 0.5) : p.line), width: _focus.hasFocus && i == current ? 2 : 1),
                ),
                child: Text(i < text.length ? text[i] : '', style: monoStyle(context, size: 24, color: p.fg)),
              ),
            ),
        ]),
        // the real field sits on top, invisible
        Positioned.fill(
          child: Opacity(
            opacity: 0,
            child: TextField(
              controller: widget.controller,
              focusNode: _focus,
              keyboardType: TextInputType.number,
              autofillHints: const [AutofillHints.oneTimeCode],
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
              enableInteractiveSelection: false,
              showCursor: false,
              onChanged: (v) {
                widget.onChanged();
                if (v.length == 6) widget.onDone();
              },
            ),
          ),
        ),
      ]),
    );
  }
}
