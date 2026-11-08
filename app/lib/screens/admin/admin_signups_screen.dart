import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/downloads.dart';
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
  Map<String, dynamic>? _review; // certificates: the saved choice, the final-check data and the stage (draft | review | published)
  bool _sending = false;

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
      await _loadReview();
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  EventItem? get _event {
    for (final e in _state.events) {
      if (e.id == _eventId) return e;
    }
    return null;
  }

  bool get _certOn {
    final c = _event?.regForm['cert'];
    return c is Map && c['enabled'] == true;
  }

  String get _stage => (_review?['stage'] ?? 'draft').toString();

  Future<void> _loadReview() async {
    final id = _eventId;
    if (id == null || !_certOn) {
      if (mounted) setState(() => _review = null);
      return;
    }
    try {
      final r = await _state.api.certReview(id);
      if (mounted) setState(() => _review = r);
    } catch (_) {
      if (mounted) setState(() => _review = null);
    }
  }

  Future<void> _certJob(Future<void> Function() job, {String? ok}) async {
    try {
      await job();
      if (ok != null && mounted) showSnack(context, ok);
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _preview(int? regId) {
    final id = _eventId!;
    return previewPdf(context, _state.api, '/event-registrations/event/$id/certificates/preview', 'certificate-preview.pdf', query: regId == null ? null : {'reg': regId});
  }

  Future<void> _editCertName(int regId, String current) async {
    final c = TextEditingController(text: current);
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Name on the certificate'),
        content: TextField(controller: c, maxLength: 80, autofocus: true, decoration: const InputDecoration(hintText: 'Full name as it should be printed')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    c.dispose();
    if (name == null) return;
    await _certJob(() => _state.api.setCertName(regId, name), ok: 'Name on the certificate saved');
  }

  Future<void> _publish({List<int>? ids}) async {
    final eid = _eventId!;
    final n = ids?.length ?? (_review?['waiting'] ?? 0);
    final yes = await confirmAction(
      context,
      title: ids != null ? 'Send a new copy?' : 'Publish and email $n certificate${n == 1 ? '' : 's'}?',
      message: ids != null ? 'This person gets the certificate again, with the corrected details.' : 'Each chosen person gets an email with their certificate attached as a PDF. Everyone else gets nothing.',
      confirmText: ids != null ? 'Send again' : 'Publish',
    );
    if (yes != true) return;
    setState(() => _sending = true);
    try {
      final r = await _state.api.certSend(eid, ids: ids);
      if (mounted) showSnack(context, 'Certificates emailed to ${r['sent'] ?? 0} people');
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Widget _certSection(Pal p) {
    final eid = _eventId!;
    final chosen = _rows.where((r) => r['cert_pick'] == true).length;
    final notYet = _rows.where((r) => r['checked_in_at'] != null && (r['email'] ?? '').toString().isNotEmpty && r['pay_status'] != 'rejected' && r['certificate_sent_at'] == null).length;
    if (_stage == 'draft' || _review == null) {
      return GlassCard(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.workspace_premium_rounded, color: p.accent),
            const SizedBox(width: 10),
            Expanded(child: Text('Certificates · step 1 of 2: choose the people', style: bodyStyle(context, weight: FontWeight.w700, size: 15))),
          ]),
          const SizedBox(height: 6),
          Text('Tick the people on the list below. Nobody is chosen until you tick them. Then go to the final check.', style: bodyStyle(context, size: 12.5, color: p.muted)),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 4, children: [
            _btn('Tick all not emailed ($notYet)', Icons.done_all_rounded, notYet == 0 ? () {} : () => _certJob(() => _state.api.certPick(eid, all: true))),
            _btn('Preview', Icons.visibility_rounded, () => _preview(null)),
            _btn('Clear', Icons.clear_all_rounded, chosen == 0 ? () {} : () => _certJob(() => _state.api.certPick(eid, all: true, picked: false))),
          ]),
          const SizedBox(height: 8),
          GradientButton(label: 'Final check ($chosen)', icon: Icons.arrow_forward_rounded, onPressed: chosen == 0 ? null : () => _certJob(() => _state.api.certStage(eid, 'review'))),
        ]),
      );
    }
    final r = _review!;
    final cert = r['cert'] is Map ? Map<String, dynamic>.from(r['cert'] as Map) : <String, dynamic>{};
    final people = (r['people'] as List? ?? const []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    final problems = (r['problems'] as List? ?? const []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    final published = _stage == 'published';
    final waiting = (r['waiting'] ?? 0) as int;
    String line(String k, String v) => v;
    Widget row(String k, String v) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 96, child: Text(k.toUpperCase(), style: monoStyle(context, size: 9.5))),
            Expanded(child: Text(line(k, v), style: bodyStyle(context, size: 13))),
          ]),
        );
    final signer = '${cert['signer'] ?? ''}, ${cert['signer_title'] ?? ''} · signature: ${cert['signature_source'] ?? ''}';
    final signer2 = '${cert['signer2'] ?? ''}'.isEmpty ? 'not shown' : '${cert['signer2']}, ${cert['signer2_title'] ?? ''} · signature: ${cert['signature2_source'] ?? ''}';
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.fact_check_rounded, color: p.accent),
          const SizedBox(width: 10),
          Expanded(child: Text('Certificates · step 2 of 2: final check${published ? ' (published)' : ''}', style: bodyStyle(context, weight: FontWeight.w700, size: 15))),
        ]),
        const SizedBox(height: 6),
        Text(published ? 'The certificates were emailed. You can still fix a name and send a new copy to one person.' : 'Look at everything once more. If it is all right, publish. If not, go back and change it: nothing has been sent yet.', style: bodyStyle(context, size: 12.5, color: p.muted)),
        const SizedBox(height: 10),
        row('Title', '${cert['title'] ?? ''}'),
        row('Organised by', '${cert['organizer'] ?? ''}'.isEmpty ? 'BAUET ICT Club' : '${cert['organizer']}'),
        row('Colours', '${cert['theme'] ?? 'gold'}'),
        row('Advisor (right)', signer),
        row('President (left)', signer2),
        row('People', '${people.length} chosen · $waiting not emailed yet'),
        const SizedBox(height: 8),
        if (problems.isEmpty)
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
            child: Row(children: [const Icon(Icons.check_circle_rounded, size: 18, color: Color(0xFF059669)), const SizedBox(width: 8), Expanded(child: Text('Everything looks right.', style: bodyStyle(context, weight: FontWeight.w700, size: 13)))]),
          )
        else
          for (final pr in problems)
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: (pr['level'] == 'error' ? const Color(0xFFEF4444) : const Color(0xFFF59E0B)).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Icon(Icons.warning_amber_rounded, size: 18, color: pr['level'] == 'error' ? const Color(0xFFEF4444) : const Color(0xFFD97706)),
                const SizedBox(width: 8),
                Expanded(child: Text('${pr['text']}', style: bodyStyle(context, size: 12.5))),
              ]),
            ),
        const SizedBox(height: 8),
        for (final x in people)
          Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
            decoration: BoxDecoration(border: Border.all(color: p.line), borderRadius: BorderRadius.circular(14)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${x['name']}${x['custom_name'] == true ? '  · custom name' : ''}', style: bodyStyle(context, weight: FontWeight.w700, size: 14)),
              Text('${(x['email'] ?? '').toString().isEmpty ? 'no email' : x['email']}${x['sent'] == true ? ' · emailed' : ''}', style: bodyStyle(context, size: 12, color: p.muted)),
              Wrap(spacing: 4, children: [
                _btn('Preview', Icons.visibility_rounded, () => _preview(x['id'] as int)),
                _btn('Edit name', Icons.edit_rounded, () => _editCertName(x['id'] as int, '${x['name']}')),
                if (published && x['sent'] == true) _btn('Send again', Icons.send_rounded, _sending ? () {} : () => _publish(ids: [x['id'] as int])),
              ]),
            ]),
          ),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 4, children: [
          _btn(published ? 'Choose more people' : 'Back to editing', Icons.arrow_back_rounded, () => _certJob(() => _state.api.certStage(eid, 'draft'))),
          _btn('Preview', Icons.visibility_rounded, () => _preview(null)),
        ]),
        const SizedBox(height: 8),
        GradientButton(label: _sending ? 'Sending…' : 'Publish: email $waiting certificate${waiting == 1 ? '' : 's'}', icon: Icons.send_rounded, onPressed: (r['can_publish'] == true && waiting > 0 && !_sending) ? () => _publish() : null),
      ]),
    );
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
                PageTopBar(
                  title: 'Event sign-ups',
                  fallback: '/admin',
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    if (_eventId != null)
                      ExportMenu(onPick: (f) {
                        final id = _eventId!;
                        if (f == 'zip') {
                          downloadAndShare(context, _state.api, '/event-registrations/zip', 'event-$id-everything.zip', query: {'event': id, 'format': 'original'});
                        } else {
                          downloadAndShare(context, _state.api, '/event-registrations/export', 'event-$id-registrations.$f', query: {'event': id, 'format': f});
                        }
                      }),
                    const AdminThemeButton(),
                  ]),
                ),
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
                if (_eventId != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: OutlinedButton.icon(onPressed: () => context.push('/admin/event-form/$_eventId'), icon: const Icon(Icons.edit_note_rounded), label: const Text('Edit sign-up form, payment, certificate')),
                  ),
                const SizedBox(height: 14),
                Row(children: [
                  _stat('Registered', seated, p.accent),
                  const SizedBox(width: 10),
                  _stat('Waiting', waiting, const Color(0xFF0EA5E9)),
                  const SizedBox(width: 10),
                  _stat('Arrived', arrived, p.tech),
                ]),
                if (_eventId != null && _certOn) ...[const SizedBox(height: 14), _certSection(p)],
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
        if (_certOn && checked) ...[
          const SizedBox(height: 8),
          Row(children: [
            Checkbox(
              value: r['cert_pick'] == true,
              onChanged: ((r['email'] ?? '').toString().isEmpty || r['pay_status'] == 'rejected' || (r['certificate_sent_at'] != null && _stage == 'published'))
                  ? null
                  : (v) => _certJob(() => _state.api.certPick(_eventId!, ids: [id], picked: v == true)),
            ),
            Expanded(child: Text(r['certificate_sent_at'] != null ? 'Certificate emailed' : (r['email'] ?? '').toString().isEmpty ? 'No email: cannot email a certificate' : 'Email a certificate to this person', style: bodyStyle(context, size: 12.5, color: p.muted))),
            IconButton(tooltip: 'Preview the certificate', onPressed: () => _preview(id), icon: const Icon(Icons.visibility_rounded, size: 20)),
            IconButton(tooltip: 'Edit the name on the certificate', onPressed: () => _editCertName(id, (r['cert_name'] ?? _display(r)).toString()), icon: const Icon(Icons.edit_rounded, size: 20)),
          ]),
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
