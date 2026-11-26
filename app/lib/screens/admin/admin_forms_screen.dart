import '../../core/i18n.dart';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/downloads.dart';
import '../../core/forms.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/dynamic_form.dart' show PickerTapField;
import '../../widgets/form_widgets.dart';
import 'admin_page.dart';
import 'admin_widgets.dart';
import 'certificate_viewer.dart';

const Map<String, String> kTypeLabels = {
  'short': 'Short answer',
  'long': 'Paragraph',
  'email': 'Email',
  'phone': 'Mobile number',
  'number': 'Number',
  'dropdown': 'Dropdown',
  'radio': 'Multiple choice',
  'checkbox': 'Checkboxes',
  'date': 'Date',
  'time': 'Time',
  'yesno': 'Yes / No',
  'scale': 'Rating scale',
  'photo': 'Picture upload',
  'section': 'Heading / note',
};

String _newId() => 'f${Random().nextInt(1 << 31).toRadixString(36).padLeft(6, '0').substring(0, 6)}';

/// Stand-alone public forms: list, create, copy, open or close, delete, and open the editor or the responses.
class AdminFormsScreen extends StatefulWidget {
  const AdminFormsScreen({super.key});

  @override
  State<AdminFormsScreen> createState() => _AdminFormsScreenState();
}

class _AdminFormsScreenState extends State<AdminFormsScreen> {
  late final AppState _state = context.read<AppState>();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final r = await _state.api.adminList('/forms');
      if (mounted) setState(() => _rows = r);
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    final c = TextEditingController();
    final title = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New form'),
        content: TextField(controller: c, autofocus: true, decoration: const InputDecoration(labelText: 'Form name')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(tr('Cancel'))),
          FilledButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: const Text('Create')),
        ],
      ),
    );
    c.dispose();
    if (title == null || title.length < 2) return;
    try {
      final f = await _state.api.adminCall('POST', '/forms', data: {'title': title});
      await _load();
      if (mounted && f is Map) await context.push('/admin/forms/${f['id']}');
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _act(Future<void> Function() job, String ok) async {
    try {
      await job();
      if (mounted) showSnack(context, ok);
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return AdminPage(
      title: 'Forms',
      onRefresh: _load,
      actions: [IconButton(tooltip: 'New form', onPressed: _create, icon: const Icon(Icons.add_circle_outline_rounded))],
      children: [
        if (_loading)
          const ShimmerList(count: 3, height: 120)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else if (_rows.isEmpty)
          const EmptyState(icon: Icons.dynamic_form_outlined, title: 'No forms yet', message: 'Tap + to make a feedback form, poll or sign-up sheet.')
        else
          for (final f in _rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassCard(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text('${f['title']}', style: bodyStyle(context, weight: FontWeight.w700, size: 16))),
                    Tag(f['is_open'] == false ? 'Closed' : 'Open', color: f['is_open'] == false ? const Color(0xFFEF4444) : p.tech),
                  ]),
                  const SizedBox(height: 4),
                  Text('/f/${f['slug']} · ${f['responses'] ?? 0} responses', style: monoStyle(context, size: 11, color: p.muted)),
                  const SizedBox(height: 6),
                  Wrap(spacing: 4, children: [
                    TextButton.icon(onPressed: () async { await context.push('/admin/forms/${f['id']}'); _load(); }, icon: const Icon(Icons.edit_rounded, size: 16), label: Text(tr('Edit'))),
                    TextButton.icon(onPressed: () => context.push('/admin/forms/${f['id']}/responses'), icon: const Icon(Icons.table_rows_rounded, size: 16), label: const Text('Responses')),
                    TextButton.icon(
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: '${AppConfig.origin}/f/${f['slug']}'));
                        if (context.mounted) showSnack(context, 'Link copied');
                      },
                      icon: const Icon(Icons.link_rounded, size: 16),
                      label: const Text('Copy link'),
                    ),
                    TextButton.icon(onPressed: () => _act(() async { await _state.api.adminCall('POST', '/forms/${f['id']}/duplicate'); }, 'Form copied'), icon: const Icon(Icons.copy_rounded, size: 16), label: const Text('Copy')),
                    TextButton.icon(
                      onPressed: () => _act(() async { await _state.api.adminCall('PUT', '/forms/${f['id']}', data: {'is_open': f['is_open'] == false}); }, f['is_open'] == false ? 'Form opened' : 'Form closed'),
                      icon: Icon(f['is_open'] == false ? Icons.lock_open_rounded : Icons.lock_outline_rounded, size: 16),
                      label: Text(f['is_open'] == false ? 'Open' : 'Close'),
                    ),
                    if (!_state.isEditor)
                      TextButton.icon(
                        onPressed: () async {
                          if (await confirmAction(context, title: 'Delete this form?', message: 'It goes to the Trash with its responses.', confirmText: 'Delete', danger: true)) {
                            await _act(() async { await _state.api.adminCall('DELETE', '/forms/${f['id']}'); }, 'Moved to Trash');
                          }
                        },
                        icon: const Icon(Icons.delete_outline_rounded, size: 16),
                        label: Text(tr('Delete')),
                      ),
                  ]),
                ]),
              ),
            ),
      ],
    );
  }
}

/// Form editor, for a stand-alone form ([formId]) or for the sign-up form of an event ([eventId]):
/// questions with their rules, colour, messages, deadline, payment, certificate and e-mail to the admin.
class AdminFormEditScreen extends StatefulWidget {
  const AdminFormEditScreen({super.key, this.formId = 0, this.eventId = 0});
  final int formId;
  final int eventId;

  @override
  State<AdminFormEditScreen> createState() => _AdminFormEditScreenState();
}

class _AdminFormEditScreenState extends State<AdminFormEditScreen> {
  late final AppState _state = context.read<AppState>();
  /// The certificate settings as they are on screen (saved with the form, and sent as they are for the live preview).
  Map<String, dynamic> _certMap() => {
        'enabled': true,
        'title': _certTitle.text.trim(),
        'theme': _certTheme.text.trim(),
        'name_font': _certFont.text.trim(),
        'second': _certSecond,
        'ribbon': _certRibbon.text.trim(),
        'body': _certBody.text.trim(),
        'show_seal': _certSeal,
        'show_watermark': _certMark,
        'organizer': _certOrganizer.text.trim(),
        'event_kind': _certKind.text.trim(),
        'note': _certNote.text.trim(),
        'signer': _certSigner.text.trim(),
        'signer_title': _certSignerTitle.text.trim(),
        'signature_url': _certSigUrl.text.trim(),
        'signer2': _certSigner2.text.trim(),
        'signer2_title': _certSigner2Title.text.trim(),
        'signature2_url': _certSig2Url.text.trim(),
      };

  void _previewCert() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => CertificateViewer(title: 'Certificate preview', load: () => _state.api.certPreviewBytes(widget.eventId, draft: _certMap()))));
  }

  bool get _isEvent => widget.eventId > 0;

  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _slug = TextEditingController();
  final _cap = TextEditingController();
  final _heading = TextEditingController();
  final _intro = TextEditingController();
  final _confirm = TextEditingController();
  final _emailNote = TextEditingController();
  final _theme = TextEditingController();
  final _amount = TextEditingController();
  final _payNote = TextEditingController();
  final Map<String, TextEditingController> _numbers = {for (final m in kPayMethods) m: TextEditingController()};
  final _certTitle = TextEditingController();
  final _certSigner = TextEditingController();
  final _certSignerTitle = TextEditingController();
  final _certTheme = TextEditingController(text: 'gold');
  final _certFont = TextEditingController(text: 'allura');
  final _certRibbon = TextEditingController();
  final _certBody = TextEditingController();
  bool _certSeal = true;
  bool _certMark = true;
  bool _certSecond = true;
  final _certOrganizer = TextEditingController();
  final _certKind = TextEditingController();
  final _certNote = TextEditingController();
  final _certSigUrl = TextEditingController();
  final _certSigner2 = TextEditingController();
  final _certSigner2Title = TextEditingController();
  final _certSig2Url = TextEditingController();

  Map<String, dynamic> _regForm = {};
  List<Q> _fields = [];
  bool _open = true;
  bool _notify = false;
  bool _payOn = false;
  bool _manual = true; // people send money by hand (an admin checks the transaction ID)
  bool _onlinePay = false; // people pay on the gateway's page (the server checks it)
  bool _gateway = false; // is the gateway set up on the server?
  bool _certOn = false;
  String _payKind = 'send_money';
  final Set<String> _methods = {'bKash'};
  String _closes = '';
  String _unique = '';
  String _feedback = ''; // slug of the form people get by e-mail after the event
  List<Map<String, dynamic>> _allForms = [];
  bool _sendingFb = false;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  List<TextEditingController> get _all => [_title, _desc, _slug, _cap, _heading, _intro, _confirm, _emailNote, _theme, _amount, _payNote, ..._numbers.values, _certFont, _certRibbon, _certBody, _certTheme, _certOrganizer, _certKind, _certNote, _certSigUrl, _certSigner2, _certSigner2Title, _certSig2Url, _certTitle, _certSigner, _certSignerTitle];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in _all) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      Map<String, dynamic> f;
      if (_isEvent) {
        f = await _state.api.event(widget.eventId);
        if (f.isEmpty) throw ApiException('Event not found', status: 404);
      } else {
        final all = await _state.api.adminList('/forms');
        final found = all.where((x) => '${x['id']}' == '${widget.formId}').firstOrNull;
        if (found == null) throw ApiException('Form not found', status: 404);
        f = found;
      }
      if (!mounted) return;
      final rf = f['reg_form'] is Map ? Map<String, dynamic>.from(f['reg_form'] as Map) : <String, dynamic>{};
      final pay = rf['payment'] is Map ? Map<String, dynamic>.from(rf['payment'] as Map) : <String, dynamic>{};
      final cert = rf['cert'] is Map ? Map<String, dynamic>.from(rf['cert'] as Map) : <String, dynamic>{};
      String s(dynamic v) => v == null ? '' : '$v';
      setState(() {
        _title.text = s(f['title']);
        _desc.text = s(f['description']);
        _slug.text = s(f['slug']);
        _cap.text = (int.tryParse(s(f['capacity'])) ?? 0) > 0 ? s(f['capacity']) : '';
        _open = f['is_open'] != false;
        _regForm = rf;
        _fields = fieldsOfForm(rf).map((e) => Map<String, dynamic>.from(e)).toList();
        _heading.text = s(rf['title']);
        _intro.text = s(rf['intro']);
        _confirm.text = s(rf['confirmation']);
        _emailNote.text = s(rf['email_note']);
        _theme.text = s(rf['theme']);
        _notify = rf['notify_admin'] == true;
        _closes = s(rf['closes_at']);
        _unique = s(rf['unique']);
        _feedback = s(rf['feedback_form']);
        _payOn = pay['enabled'] == true;
        _manual = pay['manual'] != false;
        _onlinePay = pay['online'] == true;
        _amount.text = s(pay['amount']);
        _payNote.text = s(pay['note']);
        _payKind = pay['kind'] == 'payment' ? 'payment' : 'send_money';
        _methods
          ..clear()
          ..addAll(pay['methods'] is List ? (pay['methods'] as List).map((e) => '$e') : ['bKash']);
        if (pay['numbers'] is Map) {
          (pay['numbers'] as Map).forEach((k, v) => _numbers[k]?.text = '$v');
        }
        _certOn = cert['enabled'] == true;
        _certTitle.text = s(cert['title']);
        _certSigner.text = s(cert['signer']);
        _certSignerTitle.text = s(cert['signer_title']);
        _certTheme.text = ['gold', 'royal', 'emerald'].contains(s(cert['theme'])) ? s(cert['theme']) : 'gold';
        _certFont.text = ['allura', 'alexbrush', 'vibes', 'pinyon', 'parisienne'].contains(s(cert['name_font'])) ? s(cert['name_font']) : 'allura';
        _certSecond = cert['second'] != false;
        _certRibbon.text = s(cert['ribbon']);
        _certBody.text = s(cert['body']);
        _certSeal = cert['show_seal'] != false;
        _certMark = cert['show_watermark'] != false;
        _certOrganizer.text = s(cert['organizer']);
        _certKind.text = s(cert['event_kind']);
        _certNote.text = s(cert['note']);
        _certSigUrl.text = s(cert['signature_url']);
        _certSigner2.text = s(cert['signer2']);
        _certSigner2Title.text = s(cert['signer2_title']);
        _certSig2Url.text = s(cert['signature2_url']);
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
    _state.api.gatewayOn().then((g) {
      if (mounted) setState(() => _gateway = g);
    });
    if (_isEvent) {
      try {
        final f = await _state.api.adminList('/forms');
        if (mounted) setState(() => _allForms = f);
      } on ApiException {
        // the picker just stays empty
      }
    }
  }

  Future<void> _sendFeedbackNow() async {
    setState(() => _sendingFb = true);
    try {
      final r = await _state.api.adminCall('POST', '/event-registrations/event/${widget.eventId}/feedback/send');
      if (mounted) showSnack(context, 'Feedback link sent to ${r is Map ? r['sent'] : 0} people');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _sendingFb = false);
    }
  }

  Map<String, dynamic> _buildRegForm() {
    final rf = <String, dynamic>{
      ..._regForm,
      'title': _heading.text.trim(),
      'intro': _intro.text.trim(),
      'confirmation': _confirm.text.trim(),
      'email_note': _emailNote.text.trim(),
      'theme': _theme.text.trim(),
      'notify_admin': _notify,
      'unique': _unique,
      'fields': _fields,
    };
    if (_isEvent && _feedback.isNotEmpty) {
      rf['feedback_form'] = _feedback;
    } else {
      rf.remove('feedback_form');
    }
    if (_closes.isEmpty) {
      rf.remove('closes_at');
    } else {
      rf['closes_at'] = _closes;
    }
    if (_payOn) {
      rf['payment'] = {
        'enabled': true,
        'amount': num.tryParse(_amount.text.trim()) ?? 0,
        'manual': _manual,
        'online': _onlinePay,
        'methods': _manual ? kPayMethods.where(_methods.contains).toList() : <String>[],
        'numbers': _manual ? {for (final m in _methods) m: _numbers[m]?.text.trim() ?? ''} : <String, String>{},
        'kind': _payKind,
        'note': _payNote.text.trim(),
      };
    } else {
      rf.remove('payment');
    }
    if (_certOn) {
      rf['cert'] = _certMap();
    } else {
      rf.remove('cert');
    }
    return rf;
  }

  Future<void> _save() async {
    if (_fields.any((q) => qLabel(q).trim().isEmpty)) {
      showSnack(context, 'Every question needs a title', error: true);
      return;
    }
    if (_payOn && !_manual && !_onlinePay) {
      showSnack(context, 'Choose at least one way to pay', error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      if (_isEvent) {
        await _state.api.adminCall('PUT', '/events/${widget.eventId}', data: {'reg_form': _buildRegForm()});
        await _state.loadAll(fresh: true);
      } else {
        await _state.api.adminCall('PUT', '/forms/${widget.formId}', data: {
          'title': _title.text.trim(),
          'description': _desc.text.trim(),
          'slug': _slug.text.trim(),
          'capacity': int.tryParse(_cap.text.trim()) ?? 0,
          'is_open': _open,
          'reg_form': _buildRegForm(),
        });
      }
      if (mounted) {
        showSnack(context, 'Saved');
        context.pop();
      }
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addQuestion() async {
    final type = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: ListView(shrinkWrap: true, children: [
          for (final e in kTypeLabels.entries) ListTile(title: Text(e.value), onTap: () => Navigator.pop(ctx, e.key)),
        ]),
      ),
    );
    if (type == null) return;
    setState(() => _fields.add({
          'id': _newId(),
          'type': type,
          'label': '',
          'required': false,
          if (['dropdown', 'radio', 'checkbox'].contains(type)) 'options': ['Option 1', 'Option 2'],
          if (type == 'scale') 'scale': {'max': 5, 'low': '', 'high': ''},
        }));
  }

  void _move(int i, int d) {
    final j = i + d;
    if (j < 0 || j >= _fields.length) return;
    setState(() {
      final q = _fields.removeAt(i);
      _fields.insert(j, q);
    });
  }

  Future<void> _pickClose() async {
    final now = DateTime.now();
    final d = await showDatePicker(context: context, initialDate: now, firstDate: DateTime(now.year - 1), lastDate: DateTime(now.year + 5));
    if (d == null || !mounted) return;
    final t = await showTimePicker(context: context, initialTime: const TimeOfDay(hour: 23, minute: 59));
    String two(int n) => n.toString().padLeft(2, '0');
    setState(() => _closes = '${d.year}-${two(d.month)}-${two(d.day)}T${two((t ?? const TimeOfDay(hour: 23, minute: 59)).hour)}:${two((t ?? const TimeOfDay(hour: 23, minute: 59)).minute)}');
  }

  Widget _section(String title, List<Widget> children) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: GlassCard(
          padding: const EdgeInsets.all(18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: displayStyle(context, 17)),
            const SizedBox(height: 12),
            ...children,
          ]),
        ),
      );

  Widget _gap() => const SizedBox(height: 12);

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return AdminPage(
      title: _isEvent ? 'Event sign-up form' : 'Edit form',
      children: [
        if (_loading)
          const ShimmerList(count: 3, height: 100)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else ...[
          if (!_isEvent)
            _section('Basics', [
              AppField(controller: _title, label: 'Form name', icon: Icons.title_rounded),
              _gap(),
              AppField(controller: _desc, label: 'Description (optional)', maxLines: 3),
              _gap(),
              AppField(controller: _slug, label: 'Link name (/f/…)', icon: Icons.link_rounded),
              _gap(),
              AppField(controller: _cap, label: 'Limit of responses (empty = no limit)', keyboard: TextInputType.number, icon: Icons.people_alt_rounded),
              SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Accepting responses'), value: _open, onChanged: (v) => setState(() => _open = v)),
            ]),
          _section('Look and messages', [
            AppField(controller: _heading, label: 'Heading above the questions (optional)'),
            _gap(),
            AppField(controller: _intro, label: 'Short introduction (optional)', maxLines: 3),
            _gap(),
            AppField(controller: _confirm, label: 'Thank-you message (optional)', maxLines: 2),
            _gap(),
            AppField(controller: _emailNote, label: 'Extra note in the confirmation email (optional)', maxLines: 2),
            _gap(),
            AppField(controller: _theme, label: 'Colour (hex, e.g. #1F4FD8)', icon: Icons.palette_outlined),
            PickerTapField(label: 'Closes on (optional)', value: _closes.replaceAll('T', ' '), icon: Icons.event_busy_rounded, onTap: _pickClose),
            if (_closes.isNotEmpty) Align(alignment: Alignment.centerLeft, child: TextButton(onPressed: () => setState(() => _closes = ''), child: const Text('Remove the closing date'))),
            SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Email me for every new response'), value: _notify, onChanged: (v) => setState(() => _notify = v)),
            if (_isEvent) ...[
              _gap(),
              PickerField(
                label: 'Ask for feedback after the event',
                value: _allForms.where((f) => '${f['slug']}' == _feedback).map((f) => '${f['title']}').firstOrNull ?? 'No feedback email',
                options: ['No feedback email', ..._allForms.map((f) => '${f['title']}')],
                icon: Icons.rate_review_rounded,
                onChanged: (v) => setState(() => _feedback = _allForms.where((f) => '${f['title']}' == v).map((f) => '${f['slug']}').firstOrNull ?? ''),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('The day after the event, everyone who came gets an email with this form. Make the form first under Forms.', style: bodyStyle(context, size: 12, color: p.muted)),
              ),
              if (_feedback.isNotEmpty) Align(alignment: Alignment.centerLeft, child: TextButton.icon(onPressed: _sendingFb ? null : _sendFeedbackNow, icon: const Icon(Icons.send_rounded, size: 16), label: Text(_sendingFb ? 'Sending…' : 'Send the link now'))),
              _gap(),
            ],
            PickerField(
              label: 'One answer per person (stops double sign-ups)',
              value: _fields.where((q) => qId(q) == _unique).map(qLabel).firstOrNull ?? 'No check',
              options: ['No check', ..._fields.where((q) => qType(q) != 'section' && qLabel(q).isNotEmpty).map(qLabel)],
              onChanged: (v) => setState(() => _unique = v == 'No check' ? '' : (_fields.where((q) => qLabel(q) == v).map(qId).firstOrNull ?? '')),
            ),
          ]),
          Text('QUESTIONS', style: monoStyle(context)),
          const SizedBox(height: 10),
          for (var i = 0; i < _fields.length; i++)
            QuestionCard(
              key: ValueKey(qId(_fields[i])),
              q: _fields[i],
              before: _fields.take(i).where((x) => qType(x) != 'section' && qLabel(x).isNotEmpty).toList(),
              index: i,
              count: _fields.length,
              onMove: (d) => _move(i, d),
              onRemove: () => setState(() => _fields.removeAt(i)),
              onChanged: () => setState(() {}),
            ),
          const SizedBox(height: 6),
          OutlinedButton.icon(onPressed: _addQuestion, icon: const Icon(Icons.add_rounded), label: const Text('Add a question')),
          const SizedBox(height: 18),
          _section('Payment (bKash, Nagad, Rocket)', [
            SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('This needs a payment'), value: _payOn, onChanged: (v) => setState(() => _payOn = v)),
            if (_payOn) ...[
              AppField(controller: _amount, label: 'Amount (BDT)', keyboard: TextInputType.number, icon: Icons.payments_outlined),
              _gap(),
              Text('Choose how people can pay. You can allow one way or both.', style: bodyStyle(context, size: 12.5, color: p.muted)),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(tr('Send money by hand')),
                subtitle: const Text('bKash, Nagad, Rocket + transaction ID. You press Verify. No account needed.'),
                value: _manual,
                onChanged: (v) => setState(() => _manual = v),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Pay online (payment gateway)'),
                subtitle: Text(_gateway ? 'Secure payment page. The place is confirmed at once. The company keeps a small fee.' : 'Needs a merchant account. Turns on when the keys are added on the server.'),
                value: _onlinePay && _gateway,
                onChanged: _gateway ? (v) => setState(() => _onlinePay = v) : null,
              ),
              if (_manual) ...[
                Wrap(spacing: 8, children: [
                  for (final m in kPayMethods) FilterChip(label: Text(m), selected: _methods.contains(m), onSelected: (v) => setState(() => v ? _methods.add(m) : _methods.remove(m))),
                ]),
                for (final m in kPayMethods.where(_methods.contains)) ...[
                  _gap(),
                  AppField(controller: _numbers[m]!, label: '$m number people send money to', keyboard: TextInputType.phone),
                ],
              ],
              _gap(),
              Row(children: [
                PillChip(label: 'Send Money', selected: _payKind == 'send_money', onTap: () => setState(() => _payKind = 'send_money')),
                const SizedBox(width: 10),
                PillChip(label: 'Payment', selected: _payKind == 'payment', onTap: () => setState(() => _payKind = 'payment')),
              ]),
              _gap(),
              AppField(controller: _payNote, label: 'Note for people paying (optional)', maxLines: 2),
            ],
          ]),
          if (_isEvent)
            _section('Certificate', [
              SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Give certificates to people who were checked in'), value: _certOn, onChanged: (v) => setState(() => _certOn = v)),
              if (_certOn) ...[
                AppField(controller: _certTitle, label: 'Certificate title (Certificate of Participation)'),
                _gap(),
                PickerField(label: 'Colours', value: _certTheme.text == 'royal' ? 'Royal blue' : _certTheme.text == 'emerald' ? 'Emerald green' : 'Gold (classic)', options: const ['Gold (classic)', 'Royal blue', 'Emerald green'], icon: Icons.palette_rounded, onChanged: (v) => setState(() => _certTheme.text = v == 'Royal blue' ? 'royal' : v == 'Emerald green' ? 'emerald' : 'gold')),
                _gap(),
                PickerField(label: 'Writing of the name', value: const {'allura': 'Allura (clean, default)', 'alexbrush': 'Alex Brush (bold swirls)', 'vibes': 'Great Vibes (large, graceful)', 'pinyon': 'Pinyon Script (classic)', 'parisienne': 'Parisienne (wide, light)'}[_certFont.text] ?? 'Allura (clean, default)', options: const ['Allura (clean, default)', 'Alex Brush (bold swirls)', 'Great Vibes (large, graceful)', 'Pinyon Script (classic)', 'Parisienne (wide, light)'], icon: Icons.draw_rounded, onChanged: (v) => setState(() => _certFont.text = v.startsWith('Alex') ? 'alexbrush' : v.startsWith('Great') ? 'vibes' : v.startsWith('Pinyon') ? 'pinyon' : v.startsWith('Pari') ? 'parisienne' : 'allura')),
                _gap(),
                Text('Right: the advisor (empty = Partha Pratim Debnath with his signature). Left: the president (empty = Sheikh Noor Abdullah with a designed signature).', style: bodyStyle(context, size: 12.5, color: context.pal.muted)),
                _gap(),
                AppField(controller: _certSigner, label: 'Advisor name (right)'),
                _gap(),
                AppField(controller: _certSignerTitle, label: 'Advisor role (Advisor, BAUET ICT Club)'),
                _gap(),
                ImageUploadField(controller: _certSigUrl, label: 'Advisor signature picture (right)', kind: 'logo'),
                _gap(),
                AppField(controller: _certRibbon, label: 'Ribbon text (This certificate is proudly presented to)'),
                _gap(),
                AppField(controller: _certBody, label: 'Write the whole sentence yourself (optional)', maxLines: 4),
                Padding(padding: const EdgeInsets.only(top: 4), child: Text('Empty = the standard sentence. Use {name} {event} {date} {location} {kind} {organizer}, **bold** and *italic*.', style: bodyStyle(context, size: 12, color: context.pal.muted))),
                SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Show the golden seal'), value: _certSeal, onChanged: (v) => setState(() => _certSeal = v)),
                SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Show the faint university logo behind the text'), value: _certMark, onChanged: (v) => setState(() => _certMark = v)),
                AppField(controller: _certOrganizer, label: 'Organised by (Department of ICE, BAUET)'),
                _gap(),
                AppField(controller: _certKind, label: 'Kind of event (online session, workshop...)'),
                _gap(),
                AppField(controller: _certNote, label: 'Closing line (optional)', maxLines: 2),
                _gap(),
                SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text("Show the president's signature (left)"), value: _certSecond, onChanged: (v) => setState(() => _certSecond = v)),
                AppField(controller: _certSigner2, label: 'President name (Sheikh Noor Abdullah)'),
                _gap(),
                AppField(controller: _certSigner2Title, label: 'President role (President, BAUET ICT Club)'),
                _gap(),
                ImageUploadField(controller: _certSig2Url, label: 'President signature picture (left). Empty = designed signature', kind: 'logo'),
                _gap(),
                GradientButton(label: 'Preview the certificate now', icon: Icons.visibility_rounded, onPressed: _previewCert),
                Padding(padding: const EdgeInsets.only(top: 6), child: Text('The preview uses what is on this screen, saved or not. It is exactly the PDF people get.', style: bodyStyle(context, size: 12.5, color: context.pal.muted))),
              ],
            ]),
          GradientButton(label: 'Save', icon: Icons.check_rounded, loading: _busy, onPressed: _busy ? null : _save),
          const SizedBox(height: 6),
          Text('Everything here is checked again by the server when you save.', textAlign: TextAlign.center, style: bodyStyle(context, size: 12, color: p.muted)),
        ],
      ],
    );
  }
}

const List<String> kPayMethods = ['bKash', 'Nagad', 'Rocket'];
const Map<String, List<String>> _kPatterns = {
  'Any text': ['', ''],
  'Digits only': [r'^[0-9]+$', 'Use digits only'],
  'Student ID (9 digits)': [r'^[0-9]{9}$', 'Enter your 9 digit ID'],
  'Bangladesh mobile number': [r'^(\+?88)?01[3-9][0-9]{8}$', 'Enter a valid Bangladesh mobile number'],
  'Letters only': [r"^[A-Za-z .'-]+$", 'Use letters only'],
};

/// One question in the editor: title, help text, answer rules, choices and "show only if" condition.
class QuestionCard extends StatefulWidget {
  const QuestionCard({super.key, required this.q, required this.before, required this.index, required this.count, required this.onMove, required this.onRemove, required this.onChanged});
  final Q q;
  final List<Q> before; // earlier questions a condition can look at
  final int index;
  final int count;
  final void Function(int delta) onMove;
  final VoidCallback onRemove;
  final VoidCallback onChanged;

  @override
  State<QuestionCard> createState() => _QuestionCardState();
}

class _QuestionCardState extends State<QuestionCard> {
  late final TextEditingController _label = TextEditingController(text: qLabel(widget.q));
  late final TextEditingController _help = TextEditingController(text: '${widget.q['help'] ?? ''}');
  late final TextEditingController _options = TextEditingController(text: qOptions(widget.q).join('\n'));
  late final TextEditingController _msg = TextEditingController(text: '${widget.q['patternMsg'] ?? ''}');
  late final TextEditingController _minLen = TextEditingController(text: '${widget.q['minLen'] ?? ''}');
  late final TextEditingController _maxLen = TextEditingController(text: '${widget.q['maxLen'] ?? ''}');
  late final TextEditingController _min = TextEditingController(text: '${widget.q['min'] ?? ''}');
  late final TextEditingController _max = TextEditingController(text: '${widget.q['max'] ?? ''}');
  late final TextEditingController _minSel = TextEditingController(text: '${widget.q['minSel'] ?? ''}');
  late final TextEditingController _maxSel = TextEditingController(text: '${widget.q['maxSel'] ?? ''}');
  late final TextEditingController _low = TextEditingController(text: '${(widget.q['scale'] is Map ? (widget.q['scale'] as Map)['low'] : '') ?? ''}');
  late final TextEditingController _high = TextEditingController(text: '${(widget.q['scale'] is Map ? (widget.q['scale'] as Map)['high'] : '') ?? ''}');
  late final TextEditingController _equals = TextEditingController(text: '${widget.q['showIf'] is Map ? (widget.q['showIf'] as Map)['equals'] ?? '' : ''}');

  @override
  void dispose() {
    for (final c in [_label, _help, _options, _msg, _minLen, _maxLen, _min, _max, _minSel, _maxSel, _low, _high, _equals]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Sets or removes a number rule.
  void _numRule(String key, TextEditingController c) {
    final n = num.tryParse(c.text.trim());
    if (n == null) {
      widget.q.remove(key);
    } else {
      widget.q[key] = n;
    }
  }

  void _setShowIf(String fieldLabel) {
    final q = widget.q;
    final f = widget.before.where((x) => qLabel(x) == fieldLabel).firstOrNull;
    if (f == null) {
      q.remove('showIf');
    } else {
      q['showIf'] = {'field': qId(f), 'equals': _equals.text.trim()};
    }
    setState(() {});
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final q = widget.q;
    final t = qType(q);
    final choice = ['dropdown', 'radio', 'checkbox'].contains(t);
    final cond = q['showIf'] is Map ? Map<String, dynamic>.from(q['showIf'] as Map) : null;
    final condLabel = cond == null ? 'Always' : (widget.before.where((x) => qId(x) == '${cond['field']}').map(qLabel).firstOrNull ?? 'Always');
    final currentPattern = _kPatterns.entries.where((e) => e.value[0] == '${q['pattern'] ?? ''}').map((e) => e.key).firstOrNull ?? 'Custom';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GlassCard(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Tag(kTypeLabels[t] ?? t, color: p.accent),
            const Spacer(),
            IconButton(tooltip: tr('Move up'), visualDensity: VisualDensity.compact, onPressed: widget.index == 0 ? null : () => widget.onMove(-1), icon: const Icon(Icons.arrow_upward_rounded, size: 18)),
            IconButton(tooltip: tr('Move down'), visualDensity: VisualDensity.compact, onPressed: widget.index == widget.count - 1 ? null : () => widget.onMove(1), icon: const Icon(Icons.arrow_downward_rounded, size: 18)),
            IconButton(tooltip: tr('Delete'), visualDensity: VisualDensity.compact, onPressed: widget.onRemove, icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFFEF4444))),
          ]),
          AppField(controller: _label, label: t == 'section' ? 'Heading' : 'Question', onChanged: () {
            q['label'] = _label.text;
            widget.onChanged();
          }),
          const SizedBox(height: 10),
          AppField(controller: _help, label: t == 'section' ? 'Note under the heading (optional)' : 'Help text (optional)', onChanged: () {
            if (_help.text.trim().isEmpty) {
              q.remove('help');
            } else {
              q['help'] = _help.text;
            }
          }),
          if (choice) ...[
            const SizedBox(height: 10),
            AppField(controller: _options, label: 'Options (one per line, at least 2)', maxLines: 6, onChanged: () {
              q['options'] = _options.text.split('\n').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
            }),
            SwitchListTile(contentPadding: EdgeInsets.zero, dense: true, title: const Text('Let people type their own answer ("Other")'), value: q['allowOther'] == true, onChanged: (v) => setState(() => q['allowOther'] = v)),
            SwitchListTile(contentPadding: EdgeInsets.zero, dense: true, title: const Text('Shuffle the options'), value: q['shuffle'] == true, onChanged: (v) => setState(() => q['shuffle'] = v)),
          ],
          if (t == 'short') ...[
            const SizedBox(height: 6),
            PickerField(
              label: 'What should people type?',
              value: currentPattern,
              options: _kPatterns.keys.toList(),
              onChanged: (v) {
                final r = _kPatterns[v];
                if (r == null) return;
                setState(() {
                  if (r[0].isEmpty) {
                    q.remove('pattern');
                    q.remove('patternMsg');
                    _msg.clear();
                  } else {
                    q['pattern'] = r[0];
                    q['patternMsg'] = r[1];
                    _msg.text = r[1];
                  }
                });
              },
            ),
            if ('${q['pattern'] ?? ''}'.isNotEmpty) ...[
              const SizedBox(height: 10),
              AppField(controller: _msg, label: 'Message if it is wrong', onChanged: () => q['patternMsg'] = _msg.text),
            ],
          ],
          if (t == 'short' || t == 'long') ...[
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: AppField(controller: _minLen, label: 'Min letters', keyboard: TextInputType.number, onChanged: () => _numRule('minLen', _minLen))),
              const SizedBox(width: 10),
              Expanded(child: AppField(controller: _maxLen, label: 'Max letters', keyboard: TextInputType.number, onChanged: () => _numRule('maxLen', _maxLen))),
            ]),
          ],
          if (t == 'number') ...[
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: AppField(controller: _min, label: 'Smallest', keyboard: const TextInputType.numberWithOptions(signed: true, decimal: true), onChanged: () => _numRule('min', _min))),
              const SizedBox(width: 10),
              Expanded(child: AppField(controller: _max, label: 'Biggest', keyboard: const TextInputType.numberWithOptions(signed: true, decimal: true), onChanged: () => _numRule('max', _max))),
            ]),
            SwitchListTile(contentPadding: EdgeInsets.zero, dense: true, title: const Text('Whole numbers only'), value: q['whole'] == true, onChanged: (v) => setState(() => q['whole'] = v)),
          ],
          if (t == 'checkbox') ...[
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: AppField(controller: _minSel, label: 'Choose at least', keyboard: TextInputType.number, onChanged: () => _numRule('minSel', _minSel))),
              const SizedBox(width: 10),
              Expanded(child: AppField(controller: _maxSel, label: 'Choose at most', keyboard: TextInputType.number, onChanged: () => _numRule('maxSel', _maxSel))),
            ]),
          ],
          if (t == 'scale') ...[
            const SizedBox(height: 10),
            Row(children: [
              PillChip(label: '1 to 5', selected: ((q['scale'] as Map?)?['max'] ?? 5) != 10, onTap: () => setState(() => (q['scale'] as Map)['max'] = 5)),
              const SizedBox(width: 10),
              PillChip(label: '1 to 10', selected: (q['scale'] as Map?)?['max'] == 10, onTap: () => setState(() => (q['scale'] as Map)['max'] = 10)),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: AppField(controller: _low, label: 'Low end label', onChanged: () => (q['scale'] as Map)['low'] = _low.text)),
              const SizedBox(width: 10),
              Expanded(child: AppField(controller: _high, label: 'High end label', onChanged: () => (q['scale'] as Map)['high'] = _high.text)),
            ]),
          ],
          if (t == 'section')
            SwitchListTile(contentPadding: EdgeInsets.zero, dense: true, title: const Text('Start a new page here (Next / Back buttons)'), value: q['page'] == true, onChanged: (v) => setState(() => q['page'] = v)),
          if (t != 'section') ...[
            SwitchListTile(contentPadding: EdgeInsets.zero, dense: true, title: Text(tr('Required')), value: qRequired(q), onChanged: (v) {
              setState(() => q['required'] = v);
              widget.onChanged();
            }),
            if (widget.before.isNotEmpty) ...[
              PickerField(label: 'Show this question', value: condLabel == 'Always' ? 'Always' : 'Only if "$condLabel" is…', options: ['Always', ...widget.before.map(qLabel)], onChanged: _setShowIf),
              if (cond != null) ...[
                const SizedBox(height: 10),
                AppField(controller: _equals, label: 'Answer that shows it (e.g. Yes)', onChanged: () {
                  if (q['showIf'] is Map) (q['showIf'] as Map)['equals'] = _equals.text.trim();
                }),
              ],
            ],
          ],
        ]),
      ),
    );
  }
}

/// Responses of one form: who answered what, with delete.
class AdminFormResponsesScreen extends StatefulWidget {
  const AdminFormResponsesScreen({super.key, required this.formId});
  final int formId;

  @override
  State<AdminFormResponsesScreen> createState() => _AdminFormResponsesScreenState();
}

class _AdminFormResponsesScreenState extends State<AdminFormResponsesScreen> {
  late final AppState _state = context.read<AppState>();
  List<Map<String, dynamic>> _rows = [];
  List<Q> _fields = [];
  String _title = 'Responses';
  bool _summary = false;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final forms = await _state.api.adminList('/forms');
      final f = forms.where((x) => '${x['id']}' == '${widget.formId}').firstOrNull;
      final rows = await _state.api.adminList('/forms/${widget.formId}/responses');
      if (!mounted) return;
      setState(() {
        _rows = rows;
        if (f != null) {
          _title = '${f['title']}';
          _fields = fieldsOfForm(f['reg_form'] is Map ? Map<String, dynamic>.from(f['reg_form'] as Map) : {});
        }
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// One card per question: counts for choices, ratings and yes/no, a sample of answers for the rest.
  List<Widget> _summaryCards(BuildContext context, Pal p) {
    final out = <Widget>[];
    for (final q in _fields.where((q) => qType(q) != 'section')) {
      final id = qId(q);
      final answers = _rows.map((r) => r['answers'] is Map ? (r['answers'] as Map)[id] : null).where((v) => !isBlank(v)).toList();
      final t = qType(q);
      final counted = ['dropdown', 'radio', 'checkbox', 'yesno', 'scale'].contains(t);
      final counts = <String, int>{};
      if (counted) {
        for (final a in answers) {
          for (final x in (a is List ? a : [a])) {
            counts['$x'] = (counts['$x'] ?? 0) + 1;
          }
        }
      }
      final top = counts.values.fold<int>(1, (m, v) => v > m ? v : m);
      out.add(Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: GlassCard(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(qLabel(q), style: bodyStyle(context, weight: FontWeight.w700)),
            Text('${answers.length} of ${_rows.length} answered', style: bodyStyle(context, size: 12, color: p.muted)),
            const SizedBox(height: 8),
            if (counted)
              for (final e in (counts.entries.toList()..sort((a, b) => b.value.compareTo(a.value))))
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(children: [
                    SizedBox(width: 90, child: Text(e.key, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 13))),
                    Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(value: e.value / top, minHeight: 10, backgroundColor: p.alt, color: p.accent))),
                    const SizedBox(width: 8),
                    Text('${e.value}', style: monoStyle(context, size: 11)),
                  ]),
                )
            else
              for (final a in answers.take(5)) Padding(padding: const EdgeInsets.only(bottom: 4), child: Text('• ${showValue(a)}', maxLines: 2, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 13, color: p.muted))),
          ]),
        ),
      ));
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return AdminPage(
      title: _title,
      onRefresh: _load,
      actions: [
        ExportMenu(onPick: (f) {
          final id = widget.formId;
          if (f == 'zip') {
            downloadAndShare(context, _state.api, '/forms/$id/zip', 'form-$id-everything.zip', query: {'format': 'original'});
          } else {
            downloadAndShare(context, _state.api, '/forms/$id/export', 'form-$id-responses.$f', query: {'format': f});
          }
        }),
      ],
      children: [
        if (_loading)
          const ShimmerList(count: 3, height: 120)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else ...[
          Row(children: [
            PillChip(label: 'Responses (${_rows.length})', selected: !_summary, onTap: () => setState(() => _summary = false)),
            const SizedBox(width: 10),
            PillChip(label: 'Summary', selected: _summary, onTap: () => setState(() => _summary = true)),
          ]),
          const SizedBox(height: 12),
          if (_rows.isEmpty) const EmptyState(icon: Icons.inbox_outlined, title: 'No responses yet', message: 'Share the form link to start collecting answers.'),
          if (_summary && _rows.isNotEmpty) ..._summaryCards(context, p),
          if (!_summary)
          for (final r in _rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassCard(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  for (final q in _fields.where((q) => qType(q) != 'section'))
                    if (r['answers'] is Map && !isBlank((r['answers'] as Map)[qId(q)]))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(qLabel(q), style: bodyStyle(context, size: 12, color: p.muted)),
                          SelectableText(showValue((r['answers'] as Map)[qId(q)]), style: bodyStyle(context, size: 14.5)),
                        ]),
                      ),
                  Row(children: [
                    Text('${r['created_at'] ?? ''}'.replaceFirst('T', ' ').split('.').first, style: monoStyle(context, size: 10.5, color: p.muted)),
                    const Spacer(),
                    if (!_state.isEditor)
                      TextButton.icon(
                        onPressed: () async {
                          if (!await confirmAction(context, title: 'Delete this response?', confirmText: 'Delete', danger: true)) return;
                          try {
                            await _state.api.adminCall('DELETE', '/forms/responses/${r['id']}');
                            await _load();
                          } on ApiException catch (e) {
                            if (context.mounted) showSnack(context, e.message, error: true);
                          }
                        },
                        icon: const Icon(Icons.delete_outline_rounded, size: 16),
                        label: Text(tr('Delete')),
                      ),
                  ]),
                ]),
              ),
            ),
        ],
      ],
    );
  }
}
