import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import 'form_widgets.dart';

const Map<String, Color> _kPayColors = {
  'bKash': Color(0xFFE2136E),
  'Nagad': Color(0xFFF6921E),
  'Rocket': Color(0xFF8C3494),
};

/// Shows how much to pay and where (bKash, Nagad or Rocket), then asks for the sender number and the transaction ID.
/// [value] is {method, sender, trx_id}; the parent keeps it and sends it as `payment`.
class PaymentBox extends StatefulWidget {
  const PaymentBox({super.key, required this.setting, required this.value, required this.errors, required this.onChanged});
  final Map<String, dynamic> setting;
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

  void _emit({String? method}) => widget.onChanged({
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
      ]),
    );
  }
}

class UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) =>
      newValue.copyWith(text: newValue.text.toUpperCase());
}
