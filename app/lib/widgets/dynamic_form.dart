import '../core/i18n.dart';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/config.dart';
import '../core/forms.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import 'common.dart';
import 'form_widgets.dart';

/// Draws a form (event sign-up or stand-alone form) from its question list, with multi-page forms, conditional
/// questions, answer rules, pictures and "Other" answers. The parent owns [values] and [errors].
class DynamicFormView extends StatefulWidget {
  const DynamicFormView({
    super.key,
    required this.fields,
    required this.values,
    required this.errors,
    required this.onChanged,
    required this.onErrors,
    required this.api,
    this.footer,
  });

  final List<Q> fields;
  final Map<String, dynamic> values;
  final Map<String, String> errors;
  final void Function(String id, dynamic value) onChanged;
  final void Function(Map<String, String> errors) onErrors;
  final Api api;

  /// Shown under the last page (payment box and the submit button).
  final Widget? footer;

  @override
  State<DynamicFormView> createState() => _DynamicFormViewState();
}

class _DynamicFormViewState extends State<DynamicFormView> {
  final Map<String, TextEditingController> _ctl = {};
  final Map<String, PickedPhoto> _photos = {};
  final Set<String> _uploading = {};
  int _page = 0;

  late List<List<Q>> _pages = pagesOfForm(widget.fields);

  @override
  void didUpdateWidget(covariant DynamicFormView old) {
    super.didUpdateWidget(old);
    if (!identical(old.fields, widget.fields)) _pages = pagesOfForm(widget.fields);
    // a server error on another page: take the person back to it
    if (widget.errors.isNotEmpty && !identical(old.errors, widget.errors)) {
      final bad = _pages.indexWhere((pg) => pg.any((f) => widget.errors.containsKey(qId(f))));
      if (bad >= 0 && bad != _page) _page = bad;
    }
  }

  @override
  void dispose() {
    for (final c in _ctl.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _controller(String id, String initial) =>
      _ctl.putIfAbsent(id, () => TextEditingController(text: initial));

  void _next() {
    final here = _pages[_page.clamp(0, _pages.length - 1)];
    final err = problemsOf(here, widget.values);
    if (err.isNotEmpty) {
      widget.onErrors(err);
      return;
    }
    setState(() => _page += 1);
  }

  Future<void> _pickPhoto(Q f) async {
    final id = qId(f);
    final shot = await pickPhoto(context);
    if (shot == null || !mounted) return;
    setState(() {
      _photos[id] = shot;
      _uploading.add(id);
    });
    try {
      final url = await widget.api.uploadPhoto(shot.path, shot.name, shot.mime);
      widget.onChanged(id, url);
      if (mounted) showSnack(context, 'Picture uploaded');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
      if (mounted) setState(() => _photos.remove(id));
    } catch (_) {
      if (mounted) showSnack(context, 'Could not upload the picture. Check your internet and try again.', error: true);
      if (mounted) setState(() => _photos.remove(id));
    } finally {
      if (mounted) setState(() => _uploading.remove(id));
    }
  }

  Widget _label(Q f) {
    final p = context.pal;
    final help = (f['help'] ?? '').toString();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text.rich(TextSpan(children: [
          TextSpan(text: qLabel(f).isEmpty ? 'Untitled question' : qLabel(f), style: bodyStyle(context, weight: FontWeight.w700, size: 14.5)),
          if (qRequired(f)) const TextSpan(text: ' *', style: TextStyle(color: Color(0xFFEF4444))),
        ])),
        if (help.isNotEmpty) Text(help, style: bodyStyle(context, size: 12.5, color: p.muted)),
      ]),
    );
  }

  Widget _error(String? e) => e == null
      ? const SizedBox.shrink()
      : Padding(padding: const EdgeInsets.only(top: 6), child: Text(e, style: bodyStyle(context, size: 12, color: const Color(0xFFEF4444))));

  Widget _choice({required bool on, required bool radio, required String text, required VoidCallback onTap}) {
    final p = context.pal;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: on ? p.accent : p.line, width: on ? 1.5 : 1),
            color: on ? p.accent.withValues(alpha: 0.08) : Colors.transparent,
          ),
          child: Row(children: [
            Icon(
              radio ? (on ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded) : (on ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded),
              size: 20,
              color: on ? p.accent : p.muted,
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(text, style: bodyStyle(context, size: 14.5))),
          ]),
        ),
      ),
    );
  }

  /// "Other: ____" row for multiple choice / checkbox / dropdown questions.
  Widget _otherRow(Q f, {required bool on, required bool radio, required String text, required VoidCallback onToggle, required ValueChanged<String> onText}) {
    final p = context.pal;
    final id = qId(f);
    final c = _controller('${id}__other', text);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: on ? p.accent : p.line, width: on ? 1.5 : 1),
        color: on ? p.accent.withValues(alpha: 0.08) : Colors.transparent,
      ),
      child: Row(children: [
        InkWell(
          onTap: onToggle,
          child: Icon(
            radio ? (on ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded) : (on ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded),
            size: 20,
            color: on ? p.accent : p.muted,
          ),
        ),
        const SizedBox(width: 12),
        Text('Other:', style: bodyStyle(context, size: 14.5, color: p.muted)),
        const SizedBox(width: 8),
        Expanded(
          child: TextField(
            controller: c,
            style: bodyStyle(context),
            decoration: const InputDecoration(border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, isDense: true, filled: false),
            onTap: () {
              if (!on) onToggle();
            },
            onChanged: onText,
          ),
        ),
      ]),
    );
  }

  Widget _control(Q f) {
    final p = context.pal;
    final id = qId(f);
    final v = widget.values[id];
    final err = widget.errors[id];
    void set(dynamic x) => widget.onChanged(id, x);
    final t = qType(f);
    switch (t) {
      case 'long':
        return AppField(controller: _controller(id, showValue(v)), label: 'Your answer', maxLines: 5, error: err, onChanged: () => set(_ctl[id]!.text));
      case 'email':
        return AppField(controller: _controller(id, showValue(v)), label: 'Email', keyboard: TextInputType.emailAddress, error: err, icon: Icons.mail_outline_rounded, onChanged: () => set(_ctl[id]!.text));
      case 'phone':
        return AppField(controller: _controller(id, showValue(v)), label: 'Mobile number', keyboard: TextInputType.phone, hint: '01XXXXXXXXX', error: err, icon: Icons.phone_outlined, onChanged: () => set(_ctl[id]!.text));
      case 'number':
        return AppField(
          controller: _controller(id, showValue(v)),
          label: 'Number',
          keyboard: const TextInputType.numberWithOptions(decimal: true, signed: true),
          formatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.\-]'))],
          error: err,
          onChanged: () => set(_ctl[id]!.text),
        );
      case 'dropdown':
        {
          final opts = qOptions(f);
          final other = f['allowOther'] == true;
          final shown = isOtherValue(v) ? 'Other…' : showValue(v);
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            PickerField(
              label: 'Choose',
              value: shown,
              options: [...opts, if (other) 'Other…'],
              error: err,
              onChanged: (x) => set(x == 'Other…' ? kOther : x),
            ),
            if (isOtherValue(v))
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: AppField(
                  controller: _controller('${id}__other', (v as String).substring(kOther.length)),
                  label: 'Type your answer',
                  onChanged: () => set(kOther + _ctl['${id}__other']!.text),
                ),
              ),
          ]);
        }
      case 'radio':
      case 'yesno':
        {
          final opts = t == 'yesno' ? const ['Yes', 'No'] : qOptions(f);
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            for (final o in opts) _choice(on: v == o, radio: true, text: o, onTap: () => set(o)),
            if (t == 'radio' && f['allowOther'] == true)
              _otherRow(f,
                  on: isOtherValue(v),
                  radio: true,
                  text: isOtherValue(v) ? (v as String).substring(kOther.length) : '',
                  onToggle: () => set(kOther),
                  onText: (x) => set(kOther + x)),
            _error(err),
          ]);
        }
      case 'checkbox':
        {
          final list = v is List ? v.map((e) => e.toString()).toList() : <String>[];
          final other = list.where(isOtherValue).toList();
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            for (final o in qOptions(f))
              _choice(
                on: list.contains(o),
                radio: false,
                text: o,
                onTap: () => set(list.contains(o) ? list.where((x) => x != o).toList() : [...list, o]),
              ),
            if (f['allowOther'] == true)
              _otherRow(f,
                  on: other.isNotEmpty,
                  radio: false,
                  text: other.isEmpty ? '' : other.first.substring(kOther.length),
                  onToggle: () => set(other.isNotEmpty ? list.where((x) => !isOtherValue(x)).toList() : [...list, kOther]),
                  onText: (x) => set([...list.where((e) => !isOtherValue(e)), kOther + x])),
            _error(err),
          ]);
        }
      case 'scale':
        {
          final max = (f['scale'] is Map ? int.tryParse('${(f['scale'] as Map)['max']}') : null) ?? 5;
          final low = f['scale'] is Map ? '${(f['scale'] as Map)['low'] ?? ''}' : '';
          final high = f['scale'] is Map ? '${(f['scale'] as Map)['high'] ?? ''}' : '';
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (var n = 1; n <= max; n++)
                InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => set(n),
                  child: Container(
                    width: 46,
                    height: 46,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: v == n ? p.accent : p.line),
                      color: v == n ? p.accent : Colors.transparent,
                    ),
                    child: Text('$n', style: bodyStyle(context, weight: FontWeight.w700, color: v == n ? Colors.white : p.fg)),
                  ),
                ),
            ]),
            if (low.isNotEmpty || high.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text(low, style: bodyStyle(context, size: 12, color: p.muted)),
                  Text(high, style: bodyStyle(context, size: 12, color: p.muted)),
                ]),
              ),
            _error(err),
          ]);
        }
      case 'date':
        return PickerTapField(
          label: 'Date',
          value: showValue(v),
          icon: Icons.calendar_month_rounded,
          error: err,
          onTap: () async {
            final now = DateTime.now();
            final d = await showDatePicker(context: context, initialDate: now, firstDate: DateTime(1990), lastDate: DateTime(now.year + 10));
            if (d != null) set('${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}');
          },
        );
      case 'time':
        return PickerTapField(
          label: 'Time',
          value: showValue(v),
          icon: Icons.schedule_rounded,
          error: err,
          onTap: () async {
            final tm = await showTimePicker(context: context, initialTime: TimeOfDay.now());
            if (tm != null) set('${tm.hour.toString().padLeft(2, '0')}:${tm.minute.toString().padLeft(2, '0')}');
          },
        );
      case 'photo':
        {
          final busy = _uploading.contains(id);
          final shot = _photos[id];
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: busy ? null : () => _pickPhoto(f),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: err != null ? const Color(0xFFEF4444) : p.line)),
                child: Row(children: [
                  Container(
                    width: 96,
                    height: 96,
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), color: p.alt),
                    child: busy
                        ? const Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5)))
                        : shot != null
                            ? Image.file(File(shot.path), fit: BoxFit.cover)
                            : (v is String && v.isNotEmpty)
                                ? NetImage(AppConfig.resolve(v))
                                : Icon(Icons.add_photo_alternate_outlined, color: p.muted),
                  ),
                  const SizedBox(width: 14),
                  Expanded(child: Text(busy ? 'Uploading…' : (isBlank(v) ? 'Choose a picture (JPG or PNG, max 3 MB)' : 'Uploaded ✓  Tap to change'), style: bodyStyle(context, size: 13.5, color: p.muted))),
                ]),
              ),
            ),
            _error(err),
          ]);
        }
      default:
        {
          final pattern = (f['pattern'] ?? '').toString();
          final digits = RegExp(r'^\^?\(?\[0-9\]|^\^?\\d').hasMatch(pattern);
          return AppField(
            controller: _controller(id, showValue(v)),
            label: 'Your answer',
            keyboard: digits ? TextInputType.number : TextInputType.text,
            error: err,
            textInputAction: TextInputAction.next,
            onChanged: () => set(_ctl[id]!.text),
          );
        }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final pages = _pages;
    final page = _page.clamp(0, pages.length - 1);
    final last = page == pages.length - 1;
    final here = pages[page];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (pages.length > 1) ...[
        Text('PAGE ${page + 1} OF ${pages.length}', style: monoStyle(context, size: 10, color: p.muted)),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(value: (page + 1) / pages.length, minHeight: 6, backgroundColor: p.alt, color: p.accent),
        ),
        const SizedBox(height: 18),
      ],
      for (final f in here.where((q) => isVisibleQ(q, widget.values)))
        if (qType(f) == 'section')
          Padding(
            padding: const EdgeInsets.only(top: 6, bottom: 16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Divider(color: p.line),
              Text(qLabel(f), style: displayStyle(context, 18)),
              if ((f['help'] ?? '').toString().isNotEmpty) Text(f['help'].toString(), style: bodyStyle(context, size: 13.5, color: p.muted)),
            ]),
          )
        else
          Padding(
            padding: const EdgeInsets.only(bottom: 18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _label(f),
              _control(f),
            ]),
          ),
      if (pages.length > 1 && !last)
        Row(children: [
          if (page > 0) ...[
            Expanded(child: GhostButton(label: 'Back', icon: Icons.arrow_back_rounded, onPressed: () => setState(() => _page = page - 1))),
            const SizedBox(width: 12),
          ],
          Expanded(child: GradientButton(label: 'Next', icon: Icons.arrow_forward_rounded, onPressed: _next)),
        ]),
      if (last) ...[
        if (pages.length > 1 && page > 0)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: TextButton.icon(onPressed: () => setState(() => _page = page - 1), icon: const Icon(Icons.arrow_back_rounded, size: 16), label: Text(tr('Back'))),
          ),
        if (widget.footer != null) widget.footer!,
      ],
    ]);
  }
}

/// A read-only field that opens a picker when tapped (date / time questions).
class PickerTapField extends StatelessWidget {
  const PickerTapField({super.key, required this.label, required this.value, required this.onTap, this.icon, this.error});
  final String label;
  final String value;
  final VoidCallback onTap;
  final IconData? icon;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: InputDecorator(
        decoration: InputDecoration(labelText: label, errorText: error, prefixIcon: icon == null ? null : Icon(icon, size: 19, color: p.muted)),
        isEmpty: value.isEmpty,
        child: Text(value, style: bodyStyle(context)),
      ),
    );
  }
}
