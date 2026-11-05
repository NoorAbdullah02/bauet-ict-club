import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/coder.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_widgets.dart';

class AdminLoginScreen extends StatefulWidget {
  const AdminLoginScreen({super.key});

  @override
  State<AdminLoginScreen> createState() => _AdminLoginScreenState();
}

class _AdminLoginScreenState extends State<AdminLoginScreen> {
  final _user = TextEditingController();
  final _pass = TextEditingController();
  final _code = TextEditingController();
  bool _needCode = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _user.dispose();
    _pass.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_user.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _error = 'Enter username and password');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AppState>().login(_user.text.trim(), _pass.text, code: _needCode ? _code.text.trim() : null);
      // Router redirect sends the user to /admin once isAdmin flips.
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          if (e.needsCode) _needCode = true;
          _error = _needCode && _code.text.isEmpty ? null : e.message;
        });
      }
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
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 40),
            children: [
              Row(children: [
                IconButton.filledTonal(
                  style: IconButton.styleFrom(backgroundColor: p.surface.withValues(alpha: 0.8), foregroundColor: p.fg),
                  onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
                  icon: const Icon(Icons.arrow_back_rounded),
                ),
                const Spacer(),
                const AdminThemeButton(),
              ]),
              const SizedBox(height: 40),
              Center(
                child: const LogoImage.club(height: 70).animate().scale(begin: const Offset(0.5, 0.5), duration: 600.ms, curve: Curves.elasticOut),
              ),
              const SizedBox(height: 26),
              Text('Admin sign in', textAlign: TextAlign.center, style: displayStyle(context, 32)).animate().fadeIn(delay: 200.ms),
              const SizedBox(height: 6),
              Text('Manage applications, events and notices.', textAlign: TextAlign.center, style: bodyStyle(context, color: p.muted)).animate().fadeIn(delay: 300.ms),
              const SizedBox(height: 32),
              GlassCard(
                padding: const EdgeInsets.all(20),
                child: Column(children: [
                  AppField(controller: _user, label: 'Username', icon: Icons.person_outline_rounded, textInputAction: TextInputAction.next),
                  const SizedBox(height: 14),
                  AppField(controller: _pass, label: 'Password', icon: Icons.lock_outline_rounded, obscure: true, textInputAction: TextInputAction.done, onSubmitted: _login),
                  if (_needCode) ...[
                    const SizedBox(height: 14),
                    AppField(controller: _code, label: '6-digit code or backup code', icon: Icons.shield_outlined, textInputAction: TextInputAction.done, onSubmitted: _login),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Row(children: [
                      const Icon(Icons.error_outline_rounded, size: 16, color: Color(0xFFEF4444)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!, style: bodyStyle(context, size: 13, color: const Color(0xFFEF4444)))),
                    ]),
                  ],
                  const SizedBox(height: 18),
                  GradientButton(label: 'Sign in', icon: Icons.login_rounded, loading: _busy, onPressed: _login),
                ]),
              ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1, end: 0),
            ],
          ),
        ),
      ),
    );
  }
}
