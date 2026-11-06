import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/calendar.dart';
import '../core/config.dart';
import '../core/forms.dart';
import '../core/my_tickets.dart';
import '../core/offline_cache.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/form_widgets.dart';
import 'event_detail_screen.dart';

String _day(dynamic d) => d == null ? '' : d.toString().split('T').first;

/// One person's ticket for one event: a QR code to show at the entrance, with cancel and certificate.
class TicketScreen extends StatefulWidget {
  const TicketScreen({super.key, required this.code});
  final String code;

  @override
  State<TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends State<TicketScreen> {
  late final AppState _state = context.read<AppState>();
  Map<String, dynamic>? _t;
  bool _missing = false;
  bool _loading = true;
  bool _busy = false;
  bool _gone = false;
  DateTime? _offlineAt; // set when the page shows a saved copy because there is no internet
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final t = await _state.api.ticket(widget.code);
      cacheJson('ticket_${widget.code}', t);
      if (!mounted) return;
      final ev = t['event'] is Map ? Map<String, dynamic>.from(t['event'] as Map) : <String, dynamic>{};
      setState(() {
        _t = t;
        _offlineAt = null;
        _missing = false;
        _error = null;
      });
      await saveMyTicket(SavedTicket(code: widget.code, title: (ev['title'] ?? '').toString(), date: _day(ev['date']), iso: _day(ev['date'])));
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.status != 404) {
        // no internet at the gate: show the copy saved the last time this ticket was opened
        final c = await readCachedJson('ticket_${widget.code}');
        if (c != null && mounted) {
          setState(() {
            _t = c.data;
            _offlineAt = c.at;
            _error = null;
          });
          return;
        }
      }
      setState(() {
        if (e.status == 404) {
          _missing = true;
        } else {
          _error = e.message;
        }
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cancel() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel your registration?'),
        content: const Text('Your seat goes to the next person and this ticket stops working.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep it')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Cancel registration')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busy = true);
    try {
      await _state.api.cancelTicket(widget.code);
      await forgetMyTicket(widget.code);
      if (mounted) setState(() => _gone = true);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  (String, Color, IconData) _status(String s) {
    switch (s) {
      case 'pending':
        return ('Waiting for payment check', const Color(0xFFF59E0B), Icons.schedule_rounded);
      case 'waitlist':
        return ('On the waiting list', const Color(0xFF0EA5E9), Icons.schedule_rounded);
      case 'cancelled':
        return ('Cancelled', const Color(0xFFEF4444), Icons.cancel_rounded);
      default:
        return ('You are in', const Color(0xFF10B981), Icons.check_circle_rounded);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    Widget body;
    if (_gone) {
      body = const EmptyState(icon: Icons.check_circle_outline_rounded, title: 'Registration cancelled', message: 'Your seat was given back. You can register again any time while seats are open.');
    } else if (_loading && _t == null) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_missing) {
      body = const EmptyState(icon: Icons.search_off_rounded, title: 'Ticket not found', message: 'Check the code you typed, or the link in your email.');
    } else if (_t == null) {
      body = ErrorState(message: _error ?? 'Could not load the ticket', onRetry: _load);
    } else {
      body = _ticket(context, p, _t!);
    }
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Column(children: [
              const PageTopBar(title: 'My ticket', fallback: '/tickets'),
              const SizedBox(height: 10),
              Expanded(child: body),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _ticket(BuildContext context, Pal p, Map<String, dynamic> t) {
    final ev = t['event'] is Map ? Map<String, dynamic>.from(t['event'] as Map) : <String, dynamic>{};
    final status = (t['status'] ?? 'confirmed').toString();
    final (label, tone, icon) = _status(status);
    final checkedIn = t['checked_in'] == true;
    final code = (t['code'] ?? widget.code).toString();
    final date = DateTime.tryParse(_day(ev['date']));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          if (_offlineAt != null)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), color: const Color(0xFFF59E0B).withValues(alpha: 0.14)),
              child: Row(children: [
                const Icon(Icons.cloud_off_rounded, size: 18, color: Color(0xFFF59E0B)),
                const SizedBox(width: 10),
                Expanded(child: Text('No internet. This is the copy saved on ${fmtDate(_offlineAt)}. The QR code still works at the gate. Pull down to refresh.', style: bodyStyle(context, size: 12.5))),
              ]),
            ),
          Container(
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(28), color: p.surface, border: Border.all(color: p.line)),
            clipBehavior: Clip.antiAlias,
            child: Column(children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(22, 20, 22, 20),
                decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF0A1A4A), Color(0xFF1F4FD8), Color(0xFF17A2D8)])),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('EVENT TICKET · BAUET ICT CLUB', style: monoStyle(context, size: 10, color: Colors.white70)),
                  const SizedBox(height: 8),
                  Text((ev['title'] ?? '').toString(), style: displayStyle(context, 24, color: Colors.white)),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 16, 22, 6),
                child: Column(children: [
                  _row(context, Icons.calendar_month_rounded, [fmtDate(date), (ev['time'] ?? '').toString()].where((x) => x.isNotEmpty).join(' · ')),
                  _row(context, Icons.place_rounded, (ev['location'] ?? '').toString()),
                ]),
              ),
              const Padding(padding: EdgeInsets.symmetric(horizontal: 22, vertical: 6), child: Divider()),
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 6, 22, 24),
                child: Column(children: [
                  Text('NAME', style: monoStyle(context, size: 10, color: p.muted)),
                  Text((t['name'] ?? 'Guest').toString(), textAlign: TextAlign.center, style: displayStyle(context, 24)),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(color: (checkedIn ? const Color(0xFF10B981) : tone).withValues(alpha: 0.14), borderRadius: BorderRadius.circular(99)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(icon, size: 15, color: checkedIn ? const Color(0xFF10B981) : tone),
                      const SizedBox(width: 6),
                      Text(checkedIn ? 'Checked in' : label, style: bodyStyle(context, size: 12.5, weight: FontWeight.w700, color: checkedIn ? const Color(0xFF10B981) : tone)),
                    ]),
                  ),
                  const SizedBox(height: 18),
                  TicketQr(code: code, size: 200),
                  const SizedBox(height: 12),
                  Text(prettyCode(code), style: monoStyle(context, size: 18)),
                  const SizedBox(height: 4),
                  Text('Show this at the entrance. Keep the code private.', style: bodyStyle(context, size: 12, color: p.muted)),
                  if (status == 'waitlist') _note(context, const Color(0xFF0EA5E9), 'The event is full, so you are in line. If a seat opens up you get it automatically and we email you. Pull down to refresh this page.'),
                  if (status == 'pending') _note(context, const Color(0xFFF59E0B), 'Your place is confirmed once we verify your payment. You will get an email.'),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 14),
          Wrap(spacing: 10, runSpacing: 10, alignment: WrapAlignment.center, children: [
            if (status != 'cancelled' && date != null)
              OutlinedButton.icon(
                onPressed: () => openUrl(
                    context,
                    googleCalendarUri(EventItem.fromJson({'id': ev['id'], 'title': ev['title'], 'date': _day(ev['date']), 'time': ev['time'], 'location': ev['location']})).toString()),
                icon: const Icon(Icons.event_available_rounded, size: 17),
                label: const Text('Calendar'),
              ),
            if (t['certificate'] == true)
              FilledButton.icon(
                onPressed: () => openUrl(context, '${AppConfig.baseUrl}/event-registrations/certificate/$code'),
                icon: const Icon(Icons.workspace_premium_rounded, size: 17),
                label: const Text('Certificate'),
              ),
          ]),
          if (t['can_cancel'] == true)
            Center(
              child: TextButton(
                onPressed: _busy ? null : _cancel,
                child: Text(_busy ? 'Cancelling…' : 'Cannot come? Cancel my registration', style: const TextStyle(color: Color(0xFFEF4444), decoration: TextDecoration.underline)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _row(BuildContext context, IconData icon, String text) {
    if (text.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(children: [
        Icon(icon, size: 18, color: context.pal.accent),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: bodyStyle(context, size: 14.5))),
      ]),
    );
  }

  Widget _note(BuildContext context, Color c, String text) => Container(
        margin: const EdgeInsets.only(top: 14),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
        child: Text(text, style: bodyStyle(context, size: 12.5)),
      );
}

/// "My tickets": tickets saved on this phone, plus a box to open any ticket code, ticket link, event link or form link.
class MyTicketsScreen extends StatefulWidget {
  const MyTicketsScreen({super.key});

  @override
  State<MyTicketsScreen> createState() => _MyTicketsScreenState();
}

class _MyTicketsScreenState extends State<MyTicketsScreen> {
  final _input = TextEditingController();
  List<SavedTicket> _saved = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final l = await loadMyTickets();
    if (mounted) setState(() => _saved = l);
  }

  void _open() {
    final o = parseOpenable(_input.text);
    if (o == null) {
      setState(() => _error = 'Paste a ticket code (8 or more letters and numbers) or a link.');
      return;
    }
    setState(() => _error = null);
    if (o.kind == 'short') {
      final api = context.read<AppState>().api;
      api.resolveShort(o.value).then((p) {
        if (!mounted) return;
        if (p == null || p.isEmpty) {
          setState(() => _error = 'That short link does not work.');
        } else {
          context.push(p);
        }
      });
      return;
    }
    final path = switch (o.kind) {
      'ticket' => '/ticket/${o.value}',
      'verify' => '/verify/${o.value}',
      'card' => '/card/${o.value.replaceAll('|', '?c=')}',
      'form' => '/f/${o.value}',
      _ => '/events/${o.value}',
    };
    context.push(path);
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
              const PageTopBar(title: 'My tickets', fallback: '/events'),
              const SizedBox(height: 16),
              GlassCard(
                padding: const EdgeInsets.all(18),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Open a ticket or a link', style: displayStyle(context, 18)),
                  const SizedBox(height: 4),
                  Text('Paste the ticket code from your email, or a link to an event, a form or a certificate.', style: bodyStyle(context, size: 13, color: p.muted)),
                  const SizedBox(height: 14),
                  AppField(controller: _input, label: 'Ticket code or link', error: _error, icon: Icons.qr_code_2_rounded, textInputAction: TextInputAction.go, onSubmitted: _open, onChanged: () => setState(() => _error = null)),
                  const SizedBox(height: 14),
                  GradientButton(label: 'Open', icon: Icons.arrow_forward_rounded, onPressed: _open),
                ]),
              ),
              const SizedBox(height: 22),
              Text('SAVED ON THIS PHONE', style: monoStyle(context)),
              const SizedBox(height: 12),
              if (_saved.isEmpty)
                const EmptyState(icon: Icons.confirmation_number_outlined, title: 'No tickets yet', message: 'When you register for an event, your ticket is saved here.')
              else
                for (final t in _saved)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: GlassCard(
                      onTap: () async {
                        await context.push('/ticket/${t.code}');
                        _reload();
                      },
                      padding: const EdgeInsets.all(14),
                      child: Row(children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), color: p.accent.withValues(alpha: 0.12)),
                          child: Icon(Icons.qr_code_2_rounded, color: p.accent),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(t.title.isEmpty ? 'Event ticket' : t.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700, size: 15)),
                            Text([if (t.date.isNotEmpty) t.date, prettyCode(t.code)].join(' · '), style: monoStyle(context, size: 10.5, color: p.muted)),
                          ]),
                        ),
                        IconButton(
                          tooltip: 'Remove from this list',
                          onPressed: () async {
                            await forgetMyTicket(t.code);
                            _reload();
                          },
                          icon: Icon(Icons.close_rounded, color: p.muted, size: 20),
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
