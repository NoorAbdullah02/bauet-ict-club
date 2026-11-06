import 'package:flutter/material.dart';
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

/// Event sign-ups: who registered, verify or reject payments, check people in, give a seat from the waiting list.
class AdminSignupsScreen extends StatefulWidget {
  const AdminSignupsScreen({super.key});

  @override
  State<AdminSignupsScreen> createState() => _AdminSignupsScreenState();
}

class _AdminSignupsScreenState extends State<AdminSignupsScreen> {
  late final AppState _state = context.read<AppState>();
  int? _eventId;
  List<Map<String, dynamic>> _rows = [];
  bool _loading = false;
  String? _error;
  String _filter = 'All';

  @override
  void initState() {
    super.initState();
    final ev = [..._state.events]..sort((a, b) => (b.date ?? DateTime(2000)).compareTo(a.date ?? DateTime(2000)));
    final upcoming = ev.where((e) => e.isUpcoming).toList();
    final first = upcoming.isNotEmpty ? upcoming.last : (ev.isNotEmpty ? ev.first : null);
    if (first != null) {
      _eventId = first.id;
      _load();
    }
  }

  Future<void> _load() async {
    final id = _eventId;
    if (id == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await _state.api.eventSignups(id);
      if (mounted) setState(() => _rows = r);
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _do(Future<void> Function() job, String ok) async {
    try {
      await job();
      if (mounted) showSnack(context, ok);
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  String _statusOf(Map<String, dynamic> r) {
    if (r['pay_status'] == 'rejected') return 'Rejected';
    if (r['waitlisted'] == true) return 'Waiting';
    if (r['pay_status'] == 'pending') return 'Pay check';
    return 'Confirmed';
  }

  Color _tone(String s) {
    switch (s) {
      case 'Rejected':
        return const Color(0xFFEF4444);
      case 'Waiting':
        return const Color(0xFF0EA5E9);
      case 'Pay check':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF10B981);
    }
  }

  String _display(Map<String, dynamic> r) {
    final n = (r['full_name'] ?? '').toString();
    if (n.isNotEmpty) return n;
    final a = r['answers'];
    if (a is Map && a.isNotEmpty) return showValue(a.values.first);
    return (r['email'] ?? 'Guest').toString();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final events = [..._state.events]..sort((a, b) => (b.date ?? DateTime(2000)).compareTo(a.date ?? DateTime(2000)));
    EventItem? chosen;
    for (final e in events) {
      if (e.id == _eventId) chosen = e;
    }
    final seated = _rows.where((r) => r['waitlisted'] != true && r['pay_status'] != 'rejected').length;
    final waiting = _rows.where((r) => r['waitlisted'] == true && r['pay_status'] != 'rejected').length;
    final arrived = _rows.where((r) => r['checked_in_at'] != null).length;
    final shown = _rows.where((r) {
      final s = _statusOf(r);
      return _filter == 'All' || s == _filter || (_filter == 'In' && r['checked_in_at'] != null);
    }).toList();

    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
              children: [
                const PageTopBar(title: 'Event sign-ups', fallback: '/admin', trailing: AdminThemeButton()),
                const SizedBox(height: 16),
                PickerField(
                  label: 'Event',
                  value: chosen?.title ?? '',
                  options: events.map((e) => e.title).toList(),
                  icon: Icons.event_rounded,
                  onChanged: (v) {
                    for (final e in events) {
                      if (e.title == v) _eventId = e.id;
                    }
                    setState(() => _rows = []);
                    _load();
                  },
                ),
                const SizedBox(height: 14),
                Row(children: [
                  _stat('Registered', seated, p.accent),
                  const SizedBox(width: 10),
                  _stat('Waiting', waiting, const Color(0xFF0EA5E9)),
                  const SizedBox(width: 10),
                  _stat('Arrived', arrived, p.tech),
                ]),
                const SizedBox(height: 14),
                SizedBox(
                  height: 42,
                  child: ListView(scrollDirection: Axis.horizontal, children: [
                    for (final f in const ['All', 'Confirmed', 'Pay check', 'Waiting', 'Rejected', 'In'])
                      Padding(padding: const EdgeInsets.only(right: 10), child: PillChip(label: f == 'In' ? 'Checked in' : f, selected: _filter == f, onTap: () => setState(() => _filter = f))),
                  ]),
                ),
                const SizedBox(height: 14),
                if (events.isEmpty)
                  const EmptyState(icon: Icons.event_busy_rounded, title: 'No events yet', message: 'Create an event first.')
                else if (_loading && _rows.isEmpty)
                  const ShimmerList(count: 4, height: 90)
                else if (_error != null)
                  ErrorState(message: _error!, onRetry: _load)
                else if (shown.isEmpty)
                  const EmptyState(icon: Icons.people_outline_rounded, title: 'Nobody here', message: 'No sign-ups match this filter.')
                else
                  for (final r in shown) Padding(padding: const EdgeInsets.only(bottom: 10), child: _card(context, p, r)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _stat(String label, int v, Color c) => Expanded(
        child: GlassCard(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$v', style: displayStyle(context, 26, color: c)),
            Text(label.toUpperCase(), style: monoStyle(context, size: 9.5)),
          ]),
        ),
      );

  Widget _card(BuildContext context, Pal p, Map<String, dynamic> r) {
    final id = int.tryParse('${r['id']}') ?? 0;
    final status = _statusOf(r);
    final pay = r['payment'] is Map ? Map<String, dynamic>.from(r['payment'] as Map) : null;
    final checked = r['checked_in_at'] != null;
    final sub = [(r['student_id'] ?? '').toString(), (r['email'] ?? '').toString(), (r['phone'] ?? '').toString()].where((x) => x.isNotEmpty).join(' · ');
    return GlassCard(
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_display(r), style: bodyStyle(context, weight: FontWeight.w700, size: 15.5)),
              if (sub.isNotEmpty) Text(sub, style: bodyStyle(context, size: 12.5, color: p.muted)),
            ]),
          ),
          Tag(checked ? 'Checked in' : status, color: checked ? p.tech : _tone(status)),
        ]),
        if (pay != null) ...[
          const SizedBox(height: 8),
          Text('${pay['method'] ?? ''} · ${pay['amount'] ?? ''} BDT · from ${pay['sender'] ?? ''} · TrxID ${pay['trx_id'] ?? ''}', style: monoStyle(context, size: 11, color: p.muted)),
        ],
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 4, children: [
          if (r['waitlisted'] == true) _btn('Give a seat', Icons.event_seat_rounded, () => _do(() => _state.api.promoteSignup(id), 'Seat given')),
          if (pay != null && r['pay_status'] != 'verified') _btn('Verify payment', Icons.verified_rounded, () => _do(() => _state.api.setSignupPayment(id, 'verified'), 'Payment verified')),
          if (pay != null && r['pay_status'] != 'rejected')
            _btn('Reject', Icons.block_rounded, () async {
              if (await confirmAction(context, title: 'Reject this payment?', message: 'The person gets an email and the seat is freed.', confirmText: 'Reject', danger: true)) {
                await _do(() => _state.api.setSignupPayment(id, 'rejected'), 'Payment rejected');
              }
            }),
          if (r['waitlisted'] != true && r['pay_status'] != 'rejected')
            _btn(checked ? 'Undo check-in' : 'Check in', Icons.how_to_reg_rounded, () => _do(() => _state.api.setSignupCheckin(id, !checked), checked ? 'Check-in undone' : 'Checked in')),
          _btn('Delete', Icons.delete_outline_rounded, () async {
            if (await confirmAction(context, title: 'Delete this sign-up?', message: 'It goes to the Trash. The next person waiting gets the seat.', confirmText: 'Delete', danger: true)) {
              await _do(() => _state.api.deleteSignup(id), 'Moved to Trash');
            }
          }),
        ]),
      ]),
    );
  }

  Widget _btn(String label, IconData icon, VoidCallback onTap) => TextButton.icon(
        onPressed: onTap,
        style: TextButton.styleFrom(visualDensity: VisualDensity.compact, padding: const EdgeInsets.symmetric(horizontal: 10)),
        icon: Icon(icon, size: 16),
        label: Text(label),
      );
}
