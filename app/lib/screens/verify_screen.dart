import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/forms.dart';
import '../core/theme.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'event_detail_screen.dart';

/// Is this certificate real? (the QR code on every certificate opens the same check on the website)
class VerifyScreen extends StatefulWidget {
  const VerifyScreen({super.key, required this.code});
  final String code;

  @override
  State<VerifyScreen> createState() => _VerifyScreenState();
}

class _VerifyScreenState extends State<VerifyScreen> {
  late final AppState _state = context.read<AppState>();
  Map<String, dynamic>? _r;
  String? _error;
  final _codeCtrl = TextEditingController();

  bool get _manual => widget.code.trim().isEmpty;

  @override
  void initState() {
    super.initState();
    if (!_manual) _load();
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (widget.code.trim().isEmpty) return;
    setState(() => _error = null);
    try {
      final r = await _state.api.verifyCertificate(widget.code);
      if (mounted) setState(() => _r = r);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  void _go(String raw) {
    final clean = raw.trim().toUpperCase();
    if (clean.isEmpty) return;
    context.push('/verify/${Uri.encodeComponent(clean)}');
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final r = _r;
    final valid = r != null && r['valid'] == true;
    Widget body;
    if (_manual) {
      body = Center(
        child: GlassCard(
          padding: const EdgeInsets.all(22),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.qr_code_2_rounded, size: 48, color: p.accent),
            const SizedBox(height: 10),
            Text('Check a certificate', style: displayStyle(context, 22)),
            const SizedBox(height: 6),
            Text('Type the code printed under the QR on the certificate.', textAlign: TextAlign.center, style: bodyStyle(context, color: p.muted)),
            const SizedBox(height: 14),
            TextField(
              controller: _codeCtrl,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(hintText: 'Certificate code', border: OutlineInputBorder()),
              onSubmitted: _go,
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(onPressed: () => _go(_codeCtrl.text), child: const Text('Check it')),
            ),
          ]),
        ),
      );
    } else if (_error != null) {
      body = ErrorState(message: _error!, onRetry: _load);
    } else if (r == null) {
      body = const Center(child: CircularProgressIndicator());
    } else {
      body = Center(
        child: GlassCard(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(valid ? Icons.verified_rounded : Icons.cancel_rounded, size: 60, color: valid ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
            const SizedBox(height: 12),
            Text(valid ? 'Certificate is real' : 'No certificate found', style: displayStyle(context, 24)),
            const SizedBox(height: 8),
            if (valid) ...[
              Text('${r['name'] ?? ''}', style: displayStyle(context, 22, color: p.accent)),
              const SizedBox(height: 4),
              Text('${r['event'] ?? ''}', textAlign: TextAlign.center, style: bodyStyle(context)),
              Text('${r['date'] ?? ''}'.split('T').first, style: bodyStyle(context, color: p.muted)),
              const SizedBox(height: 8),
              Text('Issued by ${r['issuedBy'] ?? 'BAUET ICT Club'}', style: bodyStyle(context, size: 12.5, color: p.muted)),
              Text(prettyCode('${r['code'] ?? widget.code}'), style: monoStyle(context, size: 12, color: p.muted)),
            ] else
              Text('This code does not match any certificate.', textAlign: TextAlign.center, style: bodyStyle(context, color: p.muted)),
          ]),
        ),
      );
    }
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(children: [
              const PageTopBar(title: 'Verify certificate', fallback: '/tickets'),
              const SizedBox(height: 10),
              Expanded(child: body),
            ]),
          ),
        ),
      ),
    );
  }
}
