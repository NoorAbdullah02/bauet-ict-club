import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../../core/forms.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../models/models.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../event_detail_screen.dart';
import 'admin_widgets.dart';

class _Entry {
  _Entry(this.name, this.text, this.ok, {this.warn = false});
  final String name;
  final String text;
  final bool ok;
  final bool warn;
}

/// Check-in desk: scan the QR code on a ticket, or type the code, and the person is marked as arrived.
class AdminCheckinScreen extends StatefulWidget {
  const AdminCheckinScreen({super.key});

  @override
  State<AdminCheckinScreen> createState() => _AdminCheckinScreenState();
}

class _AdminCheckinScreenState extends State<AdminCheckinScreen> {
  late final AppState _state = context.read<AppState>();
  final _code = TextEditingController();
  int? _eventId; // null = any event
  bool _busy = false;
  final List<_Entry> _log = [];

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _run(String raw, {bool force = false}) async {
    final o = parseOpenable(raw);
    final code = o != null && o.kind == 'ticket' ? o.value : raw.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase();
    if (code.length < 8) {
      showSnack(context, 'That does not look like a ticket code', error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      final r = await _state.api.checkIn(code, eventId: _eventId, force: force);
      final person = r['person'] is Map ? Map<String, dynamic>.from(r['person'] as Map) : <String, dynamic>{};
      final name = (person['name'] ?? 'Guest').toString();
      if (!mounted) return;
      setState(() {
        _log.insert(0, r['already'] == true ? _Entry(name, 'Already checked in', true, warn: true) : _Entry(name, 'Checked in · ${person['event'] ?? ''}', true));
        _code.clear();
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (!mounted) return;
      if (e.status == 409 && e.message.contains('not verified')) {
        final yes = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Payment not verified'),
            content: const Text('The payment for this ticket is not verified yet. Let the person in anyway?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
              TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Let in')),
            ],
          ),
        );
        if (yes == true && mounted) {
          setState(() => _busy = false);
          await _run(raw, force: true);
          return;
        }
      }
      if (mounted) setState(() => _log.insert(0, _Entry(code, e.message, false)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _scan() async {
    final value = await Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => const _ScanPage()));
    if (value != null && value.isNotEmpty && mounted) await _run(value);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final events = [..._state.events]..sort((a, b) => (b.date ?? DateTime(2000)).compareTo(a.date ?? DateTime(2000)));
    EventItem? chosen;
    for (final e in events) {
      if (e.id == _eventId) chosen = e;
    }
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: ListView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
            children: [
              const PageTopBar(title: 'Check-in desk', fallback: '/admin', trailing: AdminThemeButton()),
              const SizedBox(height: 16),
              GlassCard(
                padding: const EdgeInsets.all(18),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  PickerField(
                    label: 'Event (optional)',
                    value: chosen?.title ?? 'Any event',
                    options: ['Any event', ...events.map((e) => e.title)],
                    icon: Icons.event_rounded,
                    onChanged: (v) => setState(() {
                      _eventId = null;
                      for (final e in events) {
                        if (e.title == v) _eventId = e.id;
                      }
                    }),
                  ),
                  const SizedBox(height: 14),
                  GradientButton(label: 'Scan QR code', icon: Icons.qr_code_scanner_rounded, onPressed: _busy ? null : _scan),
                  const SizedBox(height: 14),
                  AppField(
                    controller: _code,
                    label: 'Or type the ticket code',
                    icon: Icons.keyboard_rounded,
                    textInputAction: TextInputAction.go,
                    onSubmitted: () => _run(_code.text),
                  ),
                  const SizedBox(height: 12),
                  GhostButton(label: _busy ? 'Checking…' : 'Check in', icon: Icons.how_to_reg_rounded, onPressed: _busy ? null : () => _run(_code.text)),
                ]),
              ),
              const SizedBox(height: 22),
              Text('THIS SESSION', style: monoStyle(context)),
              const SizedBox(height: 12),
              if (_log.isEmpty)
                const EmptyState(icon: Icons.how_to_reg_outlined, title: 'Nobody yet', message: 'Scanned and typed tickets show up here.')
              else
                for (final e in _log)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: GlassCard(
                      padding: const EdgeInsets.all(14),
                      child: Row(children: [
                        Icon(e.ok ? (e.warn ? Icons.info_rounded : Icons.check_circle_rounded) : Icons.error_rounded,
                            color: e.ok ? (e.warn ? const Color(0xFFF59E0B) : const Color(0xFF10B981)) : const Color(0xFFEF4444)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(e.name, style: bodyStyle(context, weight: FontWeight.w700, size: 15)),
                            Text(e.text, style: bodyStyle(context, size: 12.5, color: p.muted)),
                          ]),
                        ),
                      ]),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScanPage extends StatefulWidget {
  const _ScanPage();

  @override
  State<_ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<_ScanPage> {
  bool _done = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan a ticket')),
      body: Stack(children: [
        MobileScanner(
          onDetect: (capture) {
            if (_done) return;
            for (final b in capture.barcodes) {
              final v = b.rawValue;
              if (v != null && v.isNotEmpty) {
                _done = true;
                Navigator.of(context).pop(v);
                return;
              }
            }
          },
        ),
        Center(child: Container(width: 250, height: 250, decoration: BoxDecoration(border: Border.all(color: Colors.white, width: 3), borderRadius: BorderRadius.circular(24)))),
      ]),
    );
  }
}
