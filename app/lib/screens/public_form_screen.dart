import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/forms.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/dynamic_form.dart';
import '../widgets/payment_box.dart';
import 'event_detail_screen.dart';

/// A stand-alone public form (feedback, polls, sign-ups) opened from a /f/name link.
class PublicFormScreen extends StatefulWidget {
  const PublicFormScreen({super.key, required this.slug});
  final String slug;

  @override
  State<PublicFormScreen> createState() => _PublicFormScreenState();
}

class _PublicFormScreenState extends State<PublicFormScreen> {
  late final AppState _state = context.read<AppState>();
  Map<String, dynamic>? _form;
  bool _missing = false;
  bool _loading = true;
  String? _error;

  final Map<String, dynamic> _values = {};
  Map<String, String> _errors = {};
  Map<String, String> _payment = {};
  Map<String, String> _payErrors = {};
  bool _busy = false;
  Map<String, dynamic>? _done;
  bool _gateway = false;
  Map<String, String>? _online; // {url, tran} while the person pays on the gateway's page

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    _state.api.gatewayOn().then((g) {
      if (mounted) setState(() => _gateway = g);
    });
    try {
      final f = await _state.api.publicForm(widget.slug);
      if (mounted) {
        setState(() {
          _form = f;
          _error = null;
          _missing = false;
        });
      }
    } on ApiException catch (e) {
      if (!mounted) return;
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

  Map<String, dynamic> get _rf => _form?['reg_form'] is Map ? Map<String, dynamic>.from(_form!['reg_form'] as Map) : <String, dynamic>{};
  Map<String, dynamic> get _payCfg {
    final pay = _rf['payment'];
    return pay is Map && pay['enabled'] == true ? Map<String, dynamic>.from(pay) : {};
  }

  Future<void> _submit(List<Q> fields) async {
    final err = problemsOf(fields, _values);
    final pay = _payCfg;
    final pe = <String, String>{};
    final payMode = pay.isEmpty ? '' : payModeOf(pay, _gateway, _payment);
    if (pay.isNotEmpty && payMode == 'manual') {
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
      final r = await _state.api.submitPublicForm(widget.slug, {
        'answers': answersToSend(fields, _values),
        if (pay.isNotEmpty && payMode == 'online') 'pay_mode': 'online',
        if (pay.isNotEmpty && payMode == 'manual')
          'payment': {
            'method': (_payment['method'] ?? '').isEmpty ? PaymentBox.methodsOf(pay).first : _payment['method'],
            'sender': _payment['sender'],
            'trx_id': (_payment['trx_id'] ?? '').trim(),
          },
      });
      if ((r['pay_url'] ?? '').toString().isNotEmpty) {
        if (mounted) setState(() => _online = {'url': '${r['pay_url']}', 'tran': '${r['tran_id']}'});
        return;
      }
      if (mounted) setState(() => _done = r);
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
    Widget body;
    if (_loading && _form == null) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_missing) {
      body = const EmptyState(icon: Icons.search_off_rounded, title: 'Form not found', message: 'This form does not exist, or the link is wrong.');
    } else if (_form == null) {
      body = ErrorState(message: _error ?? 'Could not load the form', onRetry: _load);
    } else {
      body = _formBody(context, p);
    }
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Column(children: [
              const PageTopBar(title: 'Form', fallback: '/tickets'),
              const SizedBox(height: 10),
              Expanded(child: body),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _formBody(BuildContext context, Pal p) {
    final f = _form!;
    final fields = fieldsOfForm(_rf);
    final open = f['is_open'] != false;
    final cap = int.tryParse('${f['capacity'] ?? 0}') ?? 0;
    final count = int.tryParse('${f['count'] ?? 0}') ?? 0;
    final full = cap > 0 && count >= cap;
    final pay = _payCfg;
    final desc = (f['description'] ?? '').toString();
    final intro = (_rf['intro'] ?? '').toString();

    if (_online != null) {
      return Center(
        child: GlassCard(
          padding: const EdgeInsets.all(22),
          child: OnlinePayPanel(
            api: _state.api,
            tran: _online!['tran']!,
            url: _online!['url']!,
            onPaid: (_) => setState(() {
              _online = null;
              _done = {'message': '', 'pending_payment': false};
            }),
            onFailed: () {
              setState(() => _online = null);
              showSnack(context, 'The payment was not completed, so your response was not saved. You can try again.', error: true);
            },
          ),
        ),
      );
    }

    if (_done != null) {
      final msg = (_done!['message'] ?? '').toString();
      return Center(
        child: GlassCard(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.check_circle_rounded, size: 56, color: Color(0xFF10B981)),
            const SizedBox(height: 12),
            Text(_done!['pending_payment'] == true ? 'Response received' : 'Thank you!', style: displayStyle(context, 24)),
            const SizedBox(height: 8),
            Text(
              msg.isNotEmpty ? msg : (_done!['pending_payment'] == true ? 'We will check your payment and confirm by email.' : 'Your response was saved.'),
              textAlign: TextAlign.center,
              style: bodyStyle(context, color: p.muted),
            ),
            const SizedBox(height: 16),
            const CheckEmailNote(),
          ]),
        ),
      );
    }

    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.only(bottom: 40),
      children: [
        Text((f['title'] ?? '').toString(), style: displayStyle(context, 28)),
        if (desc.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(desc, style: bodyStyle(context, color: p.muted))),
        if (intro.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(intro, style: bodyStyle(context, size: 13.5, color: p.muted))),
        const SizedBox(height: 16),
        GlassCard(
          padding: const EdgeInsets.all(18),
          child: (!open || full)
              ? Text(!open ? 'This form is not accepting responses.' : 'This form has reached its limit.', style: bodyStyle(context, color: p.muted))
              : DynamicFormView(
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
                        gateway: _gateway,
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
                    GradientButton(label: _busy ? 'Submitting…' : 'Submit', icon: Icons.send_rounded, loading: _busy, onPressed: _busy ? null : () => _submit(fields)),
                  ]),
                ),
        ),
      ],
    );
  }
}
