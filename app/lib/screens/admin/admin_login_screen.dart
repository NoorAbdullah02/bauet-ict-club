import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/coder.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';

class AdminLoginScreen extends StatefulWidget {
  const AdminLoginScreen({super.key});

  @override
  State<AdminLoginScreen> createState() => _AdminLoginScreenState();
}

class _AdminLoginScreenState extends State<AdminLoginScreen> {
  final _user = TextEditingController();
  final _pass = TextEditingController();
  final _code = TextEditingController();
  final _codeFocus = FocusNode();
  bool _needCode = false;
  bool _busy = false;
  bool _slow = false; // the server is taking long: probably waking up
  bool _show = false; // show the password
  bool _testing = false;
  bool _sendingReset = false;
  int _slotsLeft = 0; // admin accounts that can still be made (at most 3 exist)
  String? _resetNote;
  String? _stage; // what the sign-in is doing right now, so it never looks frozen
  String? _diag;
  String? _error;

  @override
  void initState() {
    super.initState();
    final st = context.read<AppState>();
    st.api.signupLeft().then((n) {
      if (mounted) setState(() => _slotsLeft = n);
    });
    if (st.signOutNote != null) {
      _error = 'You were signed out: ${st.signOutNote}';
      st.signOutNote = null;
    }
  }

  @override
  void dispose() {
    _user.dispose();
    _pass.dispose();
    _code.dispose();
    _codeFocus.dispose();
    super.dispose();
  }

  Future<void> _test() async {
    setState(() {
      _testing = true;
      _diag = null;
    });
    final r = await context.read<AppState>().api.diagnose();
    if (mounted) {
      setState(() {
        _testing = false;
        _diag = r;
      });
    }
  }

  Future<void> _forgot() async {
    if (_user.text.trim().isEmpty) {
      setState(() {
        _resetNote = null;
        _error = 'Type your username first, then press Forgot password.';
      });
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _sendingReset = true;
      _error = null;
      _resetNote = null;
    });
    try {
      final msg = await context.read<AppState>().api.forgotPassword(_user.text.trim());
      if (mounted) setState(() => _resetNote = '$msg Open the link in that e-mail: it opens the website where you choose the new password.');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _sendingReset = false);
    }
  }

  Future<void> _login() async {
    if (_user.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _error = _user.text.trim().isEmpty ? 'Type your username first.' : 'Type your password.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _slow = false;
      _stage = null;
      _error = null;
    });
    final slowTimer = Timer(const Duration(seconds: 6), () {
      if (mounted && _busy) setState(() => _slow = true);
    });
    try {
      await context.read<AppState>().login(_user.text.trim(), _pass.text, code: _needCode ? _code.text.trim() : null, onStage: (t) {
        if (mounted) setState(() => _stage = t);
      });
      // go there ourselves: the router's automatic redirect does not always fire when this page was opened with push()
      if (mounted) context.go('/admin');
    } on ApiException catch (e) {
      if (mounted) {
        final first = e.needsCode && !_needCode;
        setState(() {
          if (e.needsCode) _needCode = true;
          _error = e.message;
        });
        // the code box appears under the password: put the cursor in it so it is not missed behind the keyboard
        if (first) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _codeFocus.requestFocus();
          });
        }
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      slowTimer.cancel();
      if (mounted) {
        setState(() {
          _busy = false;
          _slow = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final top = MediaQuery.of(context).padding.top;
    return Scaffold(
      body: AuroraBackground(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          child: Column(children: [
            // gradient header with the logo
            Container(
              width: double.infinity,
              padding: EdgeInsets.fromLTRB(20, top + 8, 20, 78),
              decoration: const BoxDecoration(
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(38)),
                gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF06113A), Color(0xFF1F4FD8), Color(0xFF0B7F9E)]),
              ),
              child: Stack(children: [
                Positioned(top: -30, right: -40, child: Container(width: 150, height: 150, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.08)))),
                Positioned(bottom: -50, left: -30, child: Container(width: 110, height: 110, decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF35D989).withValues(alpha: 0.18)))),
                Column(children: [
                  Row(children: [
                    IconButton.filledTonal(
                      style: IconButton.styleFrom(backgroundColor: Colors.white.withValues(alpha: 0.16), foregroundColor: Colors.white),
                      onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
                      icon: const Icon(Icons.arrow_back_rounded),
                    ),
                    const Spacer(),
                  ]),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 24, offset: const Offset(0, 10))]),
                    child: const LogoImage.club(height: 46),
                  ).animate().scale(begin: const Offset(0.6, 0.6), duration: 600.ms, curve: Curves.elasticOut),
                  const SizedBox(height: 18),
                  Text('Welcome back', style: displayStyle(context, 30, color: Colors.white)).animate().fadeIn(delay: 150.ms),
                  const SizedBox(height: 4),
                  Text('Admin sign in for the club team', style: bodyStyle(context, color: Colors.white70)).animate().fadeIn(delay: 250.ms),
                ]),
              ]),
            ),
            // the form card overlaps the header
            Transform.translate(
              offset: const Offset(0, -52),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: GlassCard(
                  padding: const EdgeInsets.fromLTRB(20, 22, 20, 16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    AppField(controller: _user, label: 'Username', icon: Icons.person_outline_rounded, textInputAction: TextInputAction.next),
                    const SizedBox(height: 14),
                    AppField(
                      controller: _pass,
                      label: 'Password',
                      icon: Icons.lock_outline_rounded,
                      obscure: !_show,
                      textInputAction: TextInputAction.done,
                      onSubmitted: _login,
                      suffix: IconButton(tooltip: _show ? 'Hide password' : 'Show password', onPressed: () => setState(() => _show = !_show), icon: Icon(_show ? Icons.visibility_off_rounded : Icons.visibility_rounded, size: 20, color: p.muted)),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(onPressed: _sendingReset ? null : _forgot, child: Text(_sendingReset ? 'Sending…' : 'Forgot password?')),
                    ),
                    if (_needCode) ...[
                      const SizedBox(height: 14),
                      AppField(controller: _code, label: '6-digit code or backup code', icon: Icons.shield_outlined, keyboard: TextInputType.number, focusNode: _codeFocus, textInputAction: TextInputAction.done, onSubmitted: _login),
                    ],
                    if (_resetNote != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), color: const Color(0xFF16A34A).withValues(alpha: 0.1), border: Border.all(color: const Color(0xFF16A34A).withValues(alpha: 0.35))),
                        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Icon(Icons.mark_email_read_rounded, size: 18, color: Color(0xFF16A34A)),
                          const SizedBox(width: 10),
                          Expanded(child: Text(_resetNote!, style: bodyStyle(context, size: 13, color: const Color(0xFF15803D), weight: FontWeight.w600))),
                        ]),
                      ),
                    ],
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
                    if (_stage != null && (_busy || _error == null)) ...[
                      const SizedBox(height: 10),
                      Text(_stage!, textAlign: TextAlign.center, style: bodyStyle(context, size: 12.5, color: p.muted)),
                    ],
                    if (_slow) ...[
                      const SizedBox(height: 12),
                      Text('The server is waking up. This can take up to a minute the first time.', style: bodyStyle(context, size: 12.5, color: p.muted)),
                    ],
                    const SizedBox(height: 18),
                    GradientButton(label: 'Sign in', icon: Icons.login_rounded, loading: _busy, onPressed: _login),
                    if (_slotsLeft > 0) ...[
                      const SizedBox(height: 10),
                      GhostButton(label: 'Create an account ($_slotsLeft left)', icon: Icons.person_add_alt_1_rounded, onPressed: () => context.push('/admin/signup')),
                    ],
                    const SizedBox(height: 4),
                    TextButton.icon(
                      onPressed: _testing ? null : _test,
                      icon: _testing ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.network_check_rounded, size: 18),
                      label: Text(_testing ? 'Testing…' : 'Test the connection'),
                    ),
                    if (_diag != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(_diag!, textAlign: TextAlign.center, style: bodyStyle(context, size: 12.5, color: p.muted))),
                  ]),
                ),
              ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.08, end: 0),
            ),
            Transform.translate(
              offset: const Offset(0, -36),
              child: Column(children: [
                Text('Only the club team can sign in here.', style: bodyStyle(context, size: 12.5, color: p.muted)),
                TextButton(onPressed: () => context.go('/home'), child: const Text('Back to the app')),
                Text('Server: ${AppConfig.origin}', style: monoStyle(context, size: 9.5, color: p.muted)),
                SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}
