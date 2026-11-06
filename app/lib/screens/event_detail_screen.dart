import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../core/calendar.dart';
import '../core/config.dart';
import '../core/forms.dart';
import '../core/my_tickets.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/dynamic_form.dart';
import '../widgets/payment_box.dart';

/// Top bar for full-screen pages: back button, title and an optional action.
class PageTopBar extends StatelessWidget {
  const PageTopBar({super.key, required this.title, this.fallback = '/home', this.trailing});
  final String title;
  final String fallback;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Row(children: [
      IconButton.filledTonal(
        style: IconButton.styleFrom(backgroundColor: p.surface.withValues(alpha: 0.8), foregroundColor: p.fg),
        onPressed: () => context.canPop() ? context.pop() : context.go(fallback),
        icon: const Icon(Icons.arrow_back_rounded),
      ),
      const SizedBox(width: 12),
      Expanded(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: displayStyle(context, 20))),
      if (trailing != null) trailing!,
    ]);
  }
}

/// One event with its own page: details and the registration form (all question types, payment, waiting list, ticket).
class EventDetailScreen extends StatefulWidget {
  const EventDetailScreen({super.key, required this.eventId});
  final int eventId;

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  late final AppState _state = context.read<AppState>();
  EventItem? _event;
  bool _missing = false;
  int? _count;

  final Map<String, dynamic> _values = {};
  Map<String, String> _errors = {};
  Map<String, String> _payment = {};
  Map<String, String> _payErrors = {};
  bool _busy = false;

  Map<String, dynamic>? _result; // the server's answer after signing up

  @override
  void initState() {
    super.initState();
    _event = _state.events.where((e) => e.id == widget.eventId).firstOrNull;
    _load();
  }

  Future<void> _load() async {
    try {
      if (_event == null) {
        final j = await _state.api.event(widget.eventId);
        if (j.isEmpty) throw ApiException('Event not found', status: 404);
        if (mounted) setState(() => _event = EventItem.fromJson(j));
      }
    } on ApiException {
      if (mounted) setState(() => _missing = true);
    }
    try {
      final c = await _state.api.eventCounts();
      if (mounted) setState(() => _count = c['${widget.eventId}'] ?? 0);
    } on ApiException {
      // the seat count is a nicety
    }
  }

  Map<String, dynamic> get _payCfg {
    final pay = _event?.regForm['payment'];
    return pay is Map && pay['enabled'] == true ? Map<String, dynamic>.from(pay) : {};
  }

  String get _link => '${AppConfig.origin}/events/${widget.eventId}';

  bool _timeUp(EventItem e) {
    var c = (e.regForm['closes_at'] ?? '').toString();
    if (c.isEmpty) return false;
    if (c.length == 10) c = '${c}T23:59';
    final bd = DateTime.now().toUtc().add(const Duration(hours: 6)); // Bangladesh time
    String two(int n) => n.toString().padLeft(2, '0');
    final now = '${bd.year}-${two(bd.month)}-${two(bd.day)}T${two(bd.hour)}:${two(bd.minute)}';
    return c.compareTo(now) < 0;
  }

  Future<void> _submit(EventItem e, List<Q> fields) async {
    final err = problemsOf(fields, _values);
    final pay = _payCfg;
    final pe = <String, String>{};
    if (pay.isNotEmpty) {
      final sender = (_payment['sender'] ?? '').replaceAll(RegExp(r'[\s-]'), '');
      if (!RegExp(r'^(\+?88)?01[3-9]\d{8}$').hasMatch(sender)) pe['sender'] = 'Enter the mobile number you paid from';
      if (!RegExp(r'^[A-Za-z0-9]{6,20}$').hasMatch((_payment['trx_id'] ?? '').trim())) pe['trx_id'] = 'Enter the transaction ID (6 to 20 letters and numbers)';
    }
    setState(() {
      _errors = err;
      _payErrors = pe;
    });
    if (err.isNotEmpty || pe.isNotEmpty) {
      showSnack(context, 'Please check the highlighted questions', error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      final r = await _state.api.registerForEvent(e.id, {
        'answers': answersToSend(fields, _values),
        if (pay.isNotEmpty)
          'payment': {
            'method': (_payment['method'] ?? '').isEmpty ? PaymentBox.methodsOf(pay).first : _payment['method'],
            'sender': _payment['sender'],
            'trx_id': (_payment['trx_id'] ?? '').trim(),
          },
      });
      final ticket = (r['ticket'] ?? '').toString();
      if (ticket.isNotEmpty) {
        await saveMyTicket(SavedTicket(code: ticket, title: e.title, date: e.date == null ? '' : fmtDate(e.date)));
      }
      if (!mounted) return;
      setState(() => _result = r);
      _load();
    } on ApiException catch (ex) {
      if (!mounted) return;
      setState(() {
        if (ex.fields.isNotEmpty) _errors = ex.fields;
      });
      showSnack(context, ex.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final e = _event;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: e == null
              ? Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    const PageTopBar(title: 'Event', fallback: '/events'),
                    Expanded(
                      child: _missing
                          ? const EmptyState(icon: Icons.event_busy_rounded, title: 'Event not found', message: 'It may have been removed.')
                          : const Center(child: CircularProgressIndicator()),
                    ),
                  ]),
                )
              : _body(context, e, p),
        ),
      ),
    );
  }

  Widget _body(BuildContext context, EventItem e, Pal p) {
    final start = eventStart(e);
    final past = start != null && start.isBefore(DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day));
    final full = e.capacity > 0 && _count != null && _count! >= e.capacity;
    final pay = _payCfg;
    final waitOpen = full && pay.isEmpty;
    final timeUp = _timeUp(e);
    final closed = !e.regOpen || past || (full && !waitOpen) || timeUp;
    final fields = fieldsOfForm(e.regForm);
    final left = (e.capacity > 0 && _count != null) ? e.capacity - _count! : null;

    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
      children: [
        PageTopBar(
          title: 'Event',
          fallback: '/events',
          trailing: IconButton(
            tooltip: 'Copy link',
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: _link));
              if (context.mounted) showSnack(context, 'Link copied');
            },
            icon: const Icon(Icons.link_rounded),
          ),
        ),
        const SizedBox(height: 14),
        if (e.imageUrl.isNotEmpty) SizedBox(height: 200, child: NetImage(e.imageUrl, radius: 24, fallbackLabel: e.title)),
        const SizedBox(height: 16),
        if (e.category.isNotEmpty) Align(alignment: Alignment.centerLeft, child: Tag(e.category, color: p.tech)),
        const SizedBox(height: 8),
        Text(e.title, style: displayStyle(context, 28)),
        const SizedBox(height: 14),
        _meta(Icons.calendar_month_rounded, fmtDate(e.date)),
        _meta(Icons.schedule_rounded, e.time),
        _meta(Icons.place_rounded, e.location),
        if (e.capacity > 0) _meta(Icons.people_alt_rounded, '${_count ?? '…'} of ${e.capacity} places taken${left != null && left > 0 && left <= 10 ? ' · only $left left' : ''}'),
        if (pay.isNotEmpty) _meta(Icons.confirmation_number_rounded, 'Fee: ${pay['amount']} BDT (${PaymentBox.methodsOf(pay).join(', ')})'),
        if (e.description.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(e.description, style: bodyStyle(context, color: p.muted, size: 15)),
        ],
        if (e.date != null && !past) ...[
          const SizedBox(height: 16),
          GhostButton(label: 'Add to calendar', icon: Icons.event_available_rounded, onPressed: () => openUrl(context, googleCalendarUri(e).toString())),
        ],
        const SizedBox(height: 20),
        GlassCard(
          padding: const EdgeInsets.all(18),
          child: _result != null ? _success(context, e, p) : _register(context, e, p, fields, closed, past, full, timeUp, waitOpen),
        ),
      ],
    );
  }

  Widget _meta(IconData icon, String text) {
    if (text.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: context.pal.tech),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: bodyStyle(context, weight: FontWeight.w600))),
      ]),
    );
  }

  Widget _register(BuildContext context, EventItem e, Pal p, List<Q> fields, bool closed, bool past, bool full, bool timeUp, bool waitOpen) {
    final pay = _payCfg;
    final rf = e.regForm;
    final intro = (rf['intro'] ?? '').toString();
    final title = (rf['title'] ?? '').toString();
    final closes = (rf['closes_at'] ?? '').toString();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), color: p.accent.withValues(alpha: 0.12)),
          child: Icon(Icons.confirmation_number_rounded, color: p.accent),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Register', style: displayStyle(context, 21)),
            Text(closed ? 'Registration is closed' : (pay.isNotEmpty ? 'Paid event' : 'Free · takes a minute'), style: bodyStyle(context, size: 12.5, color: p.muted)),
          ]),
        ),
      ]),
      const SizedBox(height: 16),
      if (closed)
        Text(
          past
              ? 'This event has already taken place.'
              : (full && !waitOpen)
                  ? 'This event is full.'
                  : timeUp
                      ? 'The registration deadline has passed.'
                      : 'Registration for this event is closed.',
          style: bodyStyle(context, color: p.muted),
        )
      else if (e.regUrl.isNotEmpty) ...[
        Text('Registration for this event is done on its own form.', style: bodyStyle(context, color: p.muted)),
        const SizedBox(height: 14),
        GradientButton(label: 'Register now', icon: Icons.open_in_new_rounded, onPressed: () => openUrl(context, e.regUrl)),
      ] else ...[
        if (title.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 10), child: Text(title, style: displayStyle(context, 18))),
        if (waitOpen)
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: const Color(0xFF0EA5E9).withValues(alpha: 0.12)),
            child: Text('All seats are taken. Join the waiting list: if someone drops out you get their seat automatically and we email you.', style: bodyStyle(context, size: 13)),
          ),
        if (intro.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 14), child: Text(intro, style: bodyStyle(context, size: 13.5, color: p.muted))),
        if (closes.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 14), child: Text('Registration closes ${closes.replaceAll('T', ' ')}', style: bodyStyle(context, size: 12.5, color: p.muted))),
        DynamicFormView(
          fields: fields,
          values: _values,
          errors: _errors,
          api: _state.api,
          onErrors: (m) => setState(() => _errors = m),
          onChanged: (id, v) => setState(() {
            _values[id] = v;
            _errors = Map.of(_errors)..remove(id);
          }),
          footer: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (pay.isNotEmpty) ...[
              PaymentBox(
                setting: pay,
                value: _payment,
                errors: _payErrors,
                onChanged: (v) => setState(() {
                  _payment = v;
                  _payErrors = {};
                }),
              ),
              const SizedBox(height: 16),
            ],
            GradientButton(
              label: _busy ? 'Submitting…' : (waitOpen ? 'Join the waiting list' : 'Submit registration'),
              icon: Icons.confirmation_number_rounded,
              loading: _busy,
              onPressed: _busy ? null : () => _submit(e, fields),
            ),
          ]),
        ),
      ],
    ]);
  }

  Widget _success(BuildContext context, EventItem e, Pal p) {
    final r = _result!;
    final waiting = r['waitlisted'] == true ? (int.tryParse('${r['position']}') ?? 1) : 0;
    final pendingPay = r['pending_payment'] == true;
    final ticket = (r['ticket'] ?? '').toString();
    final msg = (r['message'] ?? '').toString();
    final title = waiting > 0 ? 'You are on the waiting list' : (pendingPay ? 'Registration received' : 'You are registered!');
    final body = waiting > 0
        ? '${e.title} is full right now, so you are number $waiting in line. If a seat opens up you get it automatically and we email you.'
        : msg.isNotEmpty
            ? msg
            : pendingPay
                ? 'We got your payment details for ${e.title}. Your place is confirmed as soon as we verify the transaction. You will get an email.'
                : 'We saved your place for ${e.title}. If you gave an email, a confirmation is on its way.';
    return Column(children: [
      const Icon(Icons.check_circle_rounded, size: 52, color: Color(0xFF10B981)),
      const SizedBox(height: 10),
      Text(title, textAlign: TextAlign.center, style: displayStyle(context, 22)),
      const SizedBox(height: 6),
      Text(body, textAlign: TextAlign.center, style: bodyStyle(context, color: p.muted, size: 14)),
      if (ticket.isNotEmpty) ...[
        const SizedBox(height: 18),
        TicketQr(code: ticket, size: 170),
        const SizedBox(height: 8),
        Text(prettyCode(ticket), style: monoStyle(context, size: 15)),
        const SizedBox(height: 4),
        Text(waiting > 0 ? 'This ticket works only after you get a seat. It is saved in My tickets.' : 'Show this QR code at the entrance. It is saved in My tickets.',
            textAlign: TextAlign.center, style: bodyStyle(context, size: 12, color: p.muted)),
        const SizedBox(height: 14),
        GradientButton(label: 'Open my ticket', icon: Icons.qr_code_2_rounded, onPressed: () => context.push('/ticket/$ticket')),
      ],
    ]);
  }
}

/// A QR code on a white tile (white so every scanner can read it, also in dark mode).
class TicketQr extends StatelessWidget {
  const TicketQr({super.key, required this.code, this.size = 200});
  final String code;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: QrImageView(data: code, size: size, backgroundColor: Colors.white, errorCorrectionLevel: QrErrorCorrectLevel.M),
    );
  }
}
