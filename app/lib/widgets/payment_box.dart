import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/forms.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import 'common.dart';
import 'form_widgets.dart';

const Map<String, Color> _kPayColors = {
  'bKash': Color(0xFFE2136E),
  'Nagad': Color(0xFFF6921E),
  'Rocket': Color(0xFF8C3494),
};

/// Shows how much to pay and where (bKash, Nagad or Rocket), then asks for the sender number and the transaction ID.
/// [value] is {method, sender, trx_id}; the parent keeps it and sends it as `payment`.
class PaymentBox extends StatefulWidget {
  const PaymentBox({super.key, required this.setting, required this.value, required this.errors, required this.onChanged, this.gateway = false});
  final Map<String, dynamic> setting;
  final bool gateway; // is paying online set up on the server?
  final Map<String, String> value;
  final Map<String, String> errors;
  final void Function(Map<String, String> value) onChanged;

  /// Methods the organisers accept (falls back to all three).
  static List<String> methodsOf(Map<String, dynamic> setting) {
    final m = setting['methods'];
    final list = m is List ? m.map((e) => e.toString()).toList() : <String>[];
    return list.isEmpty ? const ['bKash', 'Nagad', 'Rocket'] : list;
  }

  @override
  State<PaymentBox> createState() => _PaymentBoxState();
}

class _PaymentBoxState extends State<PaymentBox> {
  late final TextEditingController _sender = TextEditingController(text: widget.value['sender'] ?? '');
  late final TextEditingController _trx = TextEditingController(text: widget.value['trx_id'] ?? '');

  @override
  void dispose() {
    _sender.dispose();
    _trx.dispose();
    super.dispose();
  }

  String get _mode => payModeOf(widget.setting, widget.gateway, widget.value);

  void _emit({String? method, String? mode}) => widget.onChanged({
        'mode': mode ?? _mode,
        'method': method ?? _method,
        'sender': _sender.text,
        'trx_id': _trx.text.toUpperCase(),
      });

  List<String> get _methods => PaymentBox.methodsOf(widget.setting);
  String get _method => (widget.value['method'] ?? '').isNotEmpty && _methods.contains(widget.value['method']) ? widget.value['method']! : _methods.first;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final s = widget.setting;
    final numbers = s['numbers'] is Map ? Map<String, dynamic>.from(s['numbers'] as Map) : <String, dynamic>{};
    final number = (numbers[_method] ?? '').toString();
    final note = (s['note'] ?? '').toString();
    final err = widget.errors;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: p.line), color: p.alt.withValues(alpha: 0.5)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.account_balance_wallet_rounded, size: 18, color: p.accent),
          const SizedBox(width: 8),
          Text('Payment: ', style: bodyStyle(context, weight: FontWeight.w700)),
          Text('${s['amount']} BDT', style: displayStyle(context, 18, color: p.accent)),
        ]),
        const SizedBox(height: 12),
        if (waysOf(s, widget.gateway).manual && waysOf(s, widget.gateway).online) ...[
          Row(children: [
            for (final o in const [('online', 'Pay online', 'Instant, nothing to type'), ('manual', 'Send money by hand', 'Then enter the transaction ID')])
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: o.$1 == 'online' ? 8 : 0),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => _emit(mode: o.$1),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: _mode == o.$1 ? p.accent : p.line, width: _mode == o.$1 ? 1.5 : 1), color: _mode == o.$1 ? p.accent.withValues(alpha: 0.1) : null),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(o.$2, style: bodyStyle(context, weight: FontWeight.w700, size: 13.5)),
                        Text(o.$3, style: bodyStyle(context, size: 11, color: p.muted)),
                      ]),
                    ),
                  ),
                ),
              ),
          ]),
          const SizedBox(height: 12),
        ],
        if (_mode == 'online')
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: p.line), color: p.surface),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [Icon(Icons.credit_card_rounded, size: 18, color: p.accent), const SizedBox(width: 8), Text('Pay online', style: bodyStyle(context, weight: FontWeight.w700))]),
              const SizedBox(height: 6),
              Text('You go to a secure payment page and pay with bKash, Nagad, Rocket or a card. When it is done you come back here and your place is confirmed at once.', style: bodyStyle(context, size: 13, color: p.muted)),
              const SizedBox(height: 6),
              Row(children: [Icon(Icons.verified_user_rounded, size: 14, color: p.muted), const SizedBox(width: 6), Expanded(child: Text('We never see your PIN or card number.', style: bodyStyle(context, size: 11.5, color: p.muted)))]),
              if (s['online'] == true && !widget.gateway && !waysOf(s, widget.gateway).manual) Padding(padding: const EdgeInsets.only(top: 8), child: Text('Online payment is not available right now. Please try again later.', style: bodyStyle(context, size: 12, color: const Color(0xFFEF4444), weight: FontWeight.w700))),
            ]),
          )
        else ...[
        if (_methods.length > 1)
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final m in _methods)
              ChoiceChip(
                label: Text(m),
                selected: _method == m,
                selectedColor: _kPayColors[m] ?? p.accent,
                labelStyle: bodyStyle(context, size: 12.5, weight: FontWeight.w700, color: _method == m ? Colors.white : p.fg),
                onSelected: (_) => _emit(method: m),
              ),
          ]),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: p.line), color: p.surface),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Send ${s['kind'] == 'payment' ? 'with Payment' : 'Money'} to this $_method number', style: bodyStyle(context, size: 12, color: p.muted)),
            const SizedBox(height: 6),
            Row(children: [
              Expanded(child: SelectableText(number, style: monoStyle(context, size: 17, color: p.fg))),
              OutlinedButton.icon(
                onPressed: number.isEmpty
                    ? null
                    : () async {
                        await Clipboard.setData(ClipboardData(text: number));
                        if (context.mounted) showSnack(context, 'Number copied');
                      },
                icon: const Icon(Icons.copy_rounded, size: 15),
                label: const Text('Copy'),
              ),
            ]),
            if (note.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(note, style: bodyStyle(context, size: 12.5, color: p.muted))),
          ]),
        ),
        const SizedBox(height: 14),
        AppField(
          controller: _sender,
          label: 'Your $_method number *',
          keyboard: TextInputType.phone,
          hint: '01XXXXXXXXX',
          error: err['sender'],
          onChanged: _emit,
        ),
        const SizedBox(height: 14),
        AppField(
          controller: _trx,
          label: 'Transaction ID *',
          hint: 'e.g. 8N7A6D5E4C',
          error: err['trx_id'],
          formatters: [FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9]')), UpperCaseFormatter()],
          onChanged: _emit,
        ),
        if (err['method'] != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(err['method']!, style: bodyStyle(context, size: 12, color: const Color(0xFFEF4444)))),
        const SizedBox(height: 10),
        Text('After you send the money, enter the transaction ID from the $_method message. We check it and confirm your place by email.',
            style: bodyStyle(context, size: 12, color: p.muted)),
        ],
      ]),
    );
  }
}

class UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) =>
      newValue.copyWith(text: newValue.text.toUpperCase());
}


/// Shown while the person pays on the gateway's page in the browser: opens it, then asks the server every few seconds
/// whether the payment arrived, so the app moves on by itself when they come back.
class OnlinePayPanel extends StatefulWidget {
  const OnlinePayPanel({super.key, required this.api, required this.tran, required this.url, required this.onPaid, required this.onFailed});
  final Api api;
  final String tran;
  final String url;
  final void Function(Map<String, dynamic> result) onPaid;
  final VoidCallback onFailed;

  @override
  State<OnlinePayPanel> createState() => _OnlinePayPanelState();
}

class _OnlinePayPanelState extends State<OnlinePayPanel> with WidgetsBindingObserver {
  Timer? _timer;
  bool _checking = false;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) openUrl(context, widget.url);
    });
    _timer = Timer.periodic(const Duration(seconds: 4), (_) => _check(quiet: true));
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _check(quiet: true); // back from the browser: look at once
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _check({bool quiet = false}) async {
    if (_checking || _done) return;
    setState(() => _checking = true);
    try {
      final r = await widget.api.payCheck(widget.tran);
      if (!mounted || _done) return;
      if (r['status'] == 'paid') {
        _done = true;
        _timer?.cancel();
        widget.onPaid(r);
      } else if (r['status'] == 'failed') {
        _done = true;
        _timer?.cancel();
        widget.onFailed();
      } else if (!quiet) {
        showSnack(context, 'Not confirmed yet. If you finished paying, wait a few seconds.');
      }
    } on ApiException {
      if (!quiet && mounted) showSnack(context, 'Could not check. Try again.', error: true);
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Column(children: [
      const SizedBox(height: 4),
      const SizedBox(width: 38, height: 38, child: CircularProgressIndicator(strokeWidth: 3)),
      const SizedBox(height: 14),
      Text('Waiting for your payment', style: displayStyle(context, 20)),
      const SizedBox(height: 6),
      Text('Finish paying on the payment page. This screen moves on by itself when the payment arrives.', textAlign: TextAlign.center, style: bodyStyle(context, size: 13.5, color: p.muted)),
      const SizedBox(height: 16),
      GradientButton(label: 'Open the payment page', icon: Icons.open_in_new_rounded, onPressed: () => openUrl(context, widget.url)),
      const SizedBox(height: 10),
      GhostButton(label: _checking ? 'Checking…' : 'I have paid: check now', icon: Icons.refresh_rounded, onPressed: _checking ? null : _check),
      const SizedBox(height: 6),
      Text('Your seat is kept for 30 minutes.', style: bodyStyle(context, size: 11.5, color: p.muted)),
    ]);
  }
}
