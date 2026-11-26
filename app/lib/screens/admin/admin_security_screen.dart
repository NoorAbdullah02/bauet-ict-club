import '../../core/i18n.dart';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/downloads.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../event_detail_screen.dart';
import 'admin_widgets.dart';

/// Sign-in security: change the password, two-step sign-in with an authenticator app (and backup codes), and sign out of other devices.
class AdminSecurityScreen extends StatefulWidget {
  const AdminSecurityScreen({super.key});

  @override
  State<AdminSecurityScreen> createState() => _AdminSecurityScreenState();
}

class _AdminSecurityScreenState extends State<AdminSecurityScreen> {
  late final AppState _state = context.read<AppState>();
  bool _loading = true;
  bool _enabled = false;
  int _codesLeft = 0;
  String? _error;

  // setup in progress
  Map<String, dynamic>? _setup;
  List<String>? _backup;

  final _password = TextEditingController();
  final _code = TextEditingController();
  bool _busy = false;
  String? _fieldError;

  // change own password
  final _oldPw = TextEditingController();
  final _newPw = TextEditingController();
  final _againPw = TextEditingController();
  bool _pwBusy = false;
  String? _pwError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _password.dispose();
    _code.dispose();
    _oldPw.dispose();
    _newPw.dispose();
    _againPw.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final s = await _state.api.authGet('/auth/2fa/status');
      if (!mounted) return;
      setState(() {
        _enabled = s['enabled'] == true;
        _codesLeft = int.tryParse('${s['backupCodesLeft'] ?? 0}') ?? 0;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _call(Future<void> Function() job) async {
    setState(() {
      _busy = true;
      _fieldError = null;
    });
    try {
      await job();
    } on ApiException catch (e) {
      if (mounted) setState(() => _fieldError = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _start() => _call(() async {
        final r = await _state.api.authPost('/auth/2fa/setup', {'password': _password.text});
        if (!mounted) return;
        setState(() {
          _setup = r;
          _password.clear();
          _code.clear();
        });
      });

  Future<void> _enable() => _call(() async {
        final r = await _state.api.authPost('/auth/2fa/enable', {'code': _code.text.trim()});
        final codes = r['backupCodes'];
        if (!mounted) return;
        setState(() {
          _backup = codes is List ? codes.map((e) => e.toString()).toList() : <String>[];
          _setup = null;
          _enabled = true;
          _codesLeft = _backup!.length;
          _code.clear();
        });
      });

  Future<void> _disable() => _call(() async {
        await _state.api.authPost('/auth/2fa/disable', {'password': _password.text, 'code': _code.text.trim()});
        if (!mounted) return;
        setState(() {
          _enabled = false;
          _password.clear();
          _code.clear();
        });
        showSnack(context, 'Two-step sign-in is off');
      });

  /// Changes the password of the signed-in admin (the server checks the current one, ends every other
  /// session and hands this device a fresh token, exactly like the website's Settings → Change password).
  Future<void> _changePassword() async {
    FocusManager.instance.primaryFocus?.unfocus();
    final current = _oldPw.text;
    final next = _newPw.text;
    if (current.isEmpty || next.isEmpty) {
      setState(() => _pwError = 'Enter your current and new password');
      return;
    }
    if (next != _againPw.text) {
      setState(() => _pwError = 'The two new passwords do not match');
      return;
    }
    setState(() {
      _pwBusy = true;
      _pwError = null;
    });
    try {
      final r = await _state.api.authPost('/auth/change-password', {'current': current, 'next': next});
      await _state.replaceToken((r['token'] ?? '').toString());
      if (!mounted) return;
      _oldPw.clear();
      _newPw.clear();
      _againPw.clear();
      showSnack(context, 'Password changed. Other devices were signed out.');
    } on ApiException catch (e) {
      if (mounted) setState(() => _pwError = e.message);
    } finally {
      if (mounted) setState(() => _pwBusy = false);
    }
  }

  Future<void> _signOutOthers() async {
    final ok = await confirmAction(context, title: 'Sign out everywhere?', message: 'Every other phone and computer is signed out at once. This one stays signed in.', confirmText: 'Sign out others');
    if (!ok) return;
    await _call(() async {
      final r = await _state.api.authPost('/auth/logout-all');
      await _state.replaceToken((r['token'] ?? '').toString());
      if (mounted) showSnack(context, 'Signed out of all other devices');
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: ListView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
            children: [
              const PageTopBar(title: 'Sign-in security', fallback: '/admin', trailing: AdminThemeButton()),
              const SizedBox(height: 16),
              if (_loading)
                const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
              else if (_error != null)
                ErrorState(message: _error!, onRetry: _load)
              else ...[
                if (_backup != null) _backupCard(context, p) else if (_setup != null) _setupCard(context, p) else _statusCard(context, p),
                const SizedBox(height: 14),
                GlassCard(
                  padding: const EdgeInsets.all(18),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Change password', style: displayStyle(context, 18)),
                    const SizedBox(height: 6),
                    Text(
                      'At least 6 characters, with letters and numbers. Every other device is signed out; this one stays signed in.',
                      style: bodyStyle(context, size: 13, color: p.muted),
                    ),
                    const SizedBox(height: 14),
                    AppField(controller: _oldPw, label: 'Current password', obscure: true, icon: Icons.lock_outline_rounded),
                    const SizedBox(height: 12),
                    AppField(controller: _newPw, label: 'New password', obscure: true, icon: Icons.key_rounded),
                    const SizedBox(height: 12),
                    AppField(
                      controller: _againPw,
                      label: 'Repeat new password',
                      obscure: true,
                      icon: Icons.key_rounded,
                      textInputAction: TextInputAction.done,
                      onSubmitted: _pwBusy ? null : _changePassword,
                    ),
                    if (_pwError != null)
                      Padding(padding: const EdgeInsets.only(top: 10), child: Text(_pwError!, style: bodyStyle(context, size: 13, color: const Color(0xFFEF4444)))),
                    const SizedBox(height: 14),
                    GradientButton(label: 'Change password', icon: Icons.key_rounded, loading: _pwBusy, onPressed: _pwBusy ? null : _changePassword),
                  ]),
                ),
                // the server's /backup route is main-admin only, so editors and admins do not see the button
                if (_state.isSuperAdmin) ...[
                  const SizedBox(height: 14),
                  GlassCard(
                    padding: const EdgeInsets.all(18),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Full backup', style: displayStyle(context, 18)),
                      const SizedBox(height: 6),
                      Text('One ZIP with every table (main admin only). Keep it somewhere safe.', style: bodyStyle(context, size: 13, color: p.muted)),
                      const SizedBox(height: 12),
                      GhostButton(label: 'Download backup', icon: Icons.backup_rounded, onPressed: () => downloadAndShare(context, _state.api, '/backup', 'bauet-ict-backup.zip')),
                    ]),
                  ),
                ],
                const SizedBox(height: 14),
                GlassCard(
                  padding: const EdgeInsets.all(18),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Sign out other devices', style: displayStyle(context, 18)),
                    const SizedBox(height: 6),
                    Text('Lost a phone or used a shared computer? This ends every other session at once.', style: bodyStyle(context, size: 13, color: p.muted)),
                    const SizedBox(height: 12),
                    GhostButton(label: 'Sign out everywhere else', icon: Icons.devices_other_rounded, onPressed: _busy ? null : _signOutOthers),
                  ]),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _err(BuildContext context) => _fieldError == null
      ? const SizedBox.shrink()
      : Padding(padding: const EdgeInsets.only(top: 10), child: Text(_fieldError!, style: bodyStyle(context, size: 13, color: const Color(0xFFEF4444))));

  Widget _statusCard(BuildContext context, Pal p) {
    return GlassCard(
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(_enabled ? Icons.verified_user_rounded : Icons.shield_outlined, color: _enabled ? const Color(0xFF10B981) : p.muted, size: 28),
          const SizedBox(width: 12),
          Expanded(child: Text(_enabled ? 'Two-step sign-in is on' : 'Two-step sign-in is off', style: displayStyle(context, 20))),
        ]),
        const SizedBox(height: 8),
        Text(
          _enabled
              ? 'Signing in needs your password and a 6-digit code from your authenticator app. Backup codes left: $_codesLeft.'
              : 'Add a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy) so a stolen password alone cannot open the admin.',
          style: bodyStyle(context, size: 13.5, color: p.muted),
        ),
        const SizedBox(height: 14),
        if (!_enabled) ...[
          AppField(controller: _password, label: 'Your password', obscure: true, icon: Icons.lock_outline_rounded),
          const SizedBox(height: 12),
          GradientButton(label: 'Turn on', icon: Icons.shield_rounded, loading: _busy, onPressed: _busy ? null : _start),
        ] else ...[
          AppField(controller: _password, label: 'Your password', obscure: true, icon: Icons.lock_outline_rounded),
          const SizedBox(height: 12),
          AppField(controller: _code, label: 'Code from the app (or a backup code)', icon: Icons.pin_rounded),
          const SizedBox(height: 12),
          GhostButton(label: 'Turn off', icon: Icons.shield_outlined, onPressed: _busy ? null : _disable),
        ],
        _err(context),
      ]),
    );
  }

  Widget _setupCard(BuildContext context, Pal p) {
    final qr = (_setup!['qr'] ?? '').toString();
    Uint8List? bytes;
    try {
      if (qr.contains(',')) bytes = base64Decode(qr.split(',').last);
    } catch (_) {
      bytes = null;
    }
    final secret = (_setup!['secret'] ?? '').toString();
    return GlassCard(
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Step 2: add it to your authenticator app', style: displayStyle(context, 19)),
        const SizedBox(height: 8),
        Text('Open the authenticator app on another phone (or this one), choose "Add account", then scan this picture or type the key. Then enter the 6-digit code it shows.', style: bodyStyle(context, size: 13.5, color: p.muted)),
        const SizedBox(height: 14),
        if (bytes != null) Center(child: Container(padding: const EdgeInsets.all(8), color: Colors.white, child: Image.memory(bytes, width: 200, height: 200))),
        const SizedBox(height: 12),
        Text('KEY (if you cannot scan)', style: monoStyle(context, size: 10, color: p.muted)),
        Row(children: [
          Expanded(child: SelectableText(secret, style: monoStyle(context, size: 14, color: p.fg))),
          IconButton(
            tooltip: 'Copy key',
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: secret));
              if (context.mounted) showSnack(context, 'Key copied');
            },
            icon: const Icon(Icons.copy_rounded, size: 18),
          ),
        ]),
        const SizedBox(height: 10),
        AppField(controller: _code, label: '6-digit code', keyboard: TextInputType.number, icon: Icons.pin_rounded, maxLength: 6),
        const SizedBox(height: 12),
        GradientButton(label: 'Confirm and turn on', icon: Icons.check_rounded, loading: _busy, onPressed: _busy ? null : _enable),
        TextButton(onPressed: () => setState(() => _setup = null), child: Text(tr('Cancel'))),
        _err(context),
      ]),
    );
  }

  Widget _backupCard(BuildContext context, Pal p) {
    final codes = _backup!;
    return GlassCard(
      padding: const EdgeInsets.all(18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.verified_user_rounded, color: Color(0xFF10B981), size: 28),
          const SizedBox(width: 12),
          Expanded(child: Text('Two-step sign-in is on', style: displayStyle(context, 20))),
        ]),
        const SizedBox(height: 8),
        Text('Save these backup codes somewhere safe. Each works once if you lose your phone. They are shown only now.', style: bodyStyle(context, size: 13.5, color: p.muted)),
        const SizedBox(height: 12),
        Wrap(spacing: 10, runSpacing: 8, children: [
          for (final c in codes)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(10), border: Border.all(color: p.line)),
              child: SelectableText(c, style: monoStyle(context, size: 14, color: p.fg)),
            ),
        ]),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(
            child: GhostButton(
              label: 'Copy all',
              icon: Icons.copy_rounded,
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: codes.join('\n')));
                if (context.mounted) showSnack(context, 'Codes copied');
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: GradientButton(label: 'I saved them', icon: Icons.check_rounded, onPressed: () => setState(() => _backup = null))),
        ]),
      ]),
    );
  }
}
