import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../core/i18n.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import 'image_editor.dart';

/// Labeled text field with external (server/validator) error text.
class AppField extends StatelessWidget {
  const AppField({
    super.key,
    required this.controller,
    required this.label,
    this.error,
    this.keyboard,
    this.maxLines = 1,
    this.maxLength,
    this.obscure = false,
    this.hint,
    this.onChanged,
    this.icon,
    this.formatters,
    this.textInputAction,
    this.onSubmitted,
    this.focusNode,
  });

  final TextEditingController controller;
  final String label;
  final String? error;
  final TextInputType? keyboard;
  final int maxLines;
  final int? maxLength;
  final bool obscure;
  final String? hint;
  final VoidCallback? onChanged;
  final IconData? icon;
  final List<TextInputFormatter>? formatters;
  final TextInputAction? textInputAction;
  final VoidCallback? onSubmitted;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final hints = keyboard == TextInputType.emailAddress
        ? const [AutofillHints.email]
        : keyboard == TextInputType.phone
            ? const [AutofillHints.telephoneNumber]
            : (label == 'Full name' || label == 'Your name')
                ? const [AutofillHints.name]
                : null;
    // autocorrect and suggestions change e-mails, user names, IDs and numbers: switch them off there
    final plain = obscure || keyboard == TextInputType.emailAddress || keyboard == TextInputType.phone || keyboard == TextInputType.number || keyboard == TextInputType.url ||
        const ['Username', 'Student ID', 'Batch', 'Email', 'Mobile (01XXXXXXXXX)'].contains(label) || label.toLowerCase().contains('e-mail') || label.toLowerCase().contains('code');
    return TextField(
      focusNode: focusNode,
      autocorrect: !plain,
      enableSuggestions: !plain,
      textCapitalization: plain ? TextCapitalization.none : TextCapitalization.sentences,
      autofillHints: hints,
      controller: controller,
      keyboardType: keyboard,
      maxLines: obscure ? 1 : maxLines,
      minLines: 1,
      maxLength: maxLength,
      obscureText: obscure,
      inputFormatters: formatters,
      textInputAction: textInputAction,
      onSubmitted: onSubmitted == null ? null : (_) => onSubmitted!(),
      onChanged: onChanged == null ? null : (_) => onChanged!(),
      style: bodyStyle(context),
      cursorColor: p.tech,
      decoration: InputDecoration(
        labelText: tr(label),
        hintText: hint == null ? null : tr(hint!),
        errorText: error,
        counterText: '',
        prefixIcon: icon == null ? null : Icon(icon, size: 19, color: p.muted),
        alignLabelWithHint: maxLines > 1,
      ),
    );
  }
}

/// Tap-to-pick field that opens a bottom sheet list (replaces dropdowns).
class PickerField extends StatelessWidget {
  const PickerField({super.key, required this.label, required this.value, required this.options, required this.onChanged, this.error, this.icon});
  final String label;
  final String value;
  final List<String> options;
  final ValueChanged<String> onChanged;
  final String? error;
  final IconData? icon;

  Future<void> _open(BuildContext context) async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (ctx) => _PickerSheet(label: label, options: options, value: value),
    );
    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GestureDetector(
      onTap: () => _open(context),
      behavior: HitTestBehavior.opaque,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          errorText: error,
          prefixIcon: icon == null ? null : Icon(icon, size: 19, color: p.muted),
          suffixIcon: Icon(Icons.expand_more_rounded, color: p.muted),
        ),
        isEmpty: value.isEmpty,
        child: Text(value, style: bodyStyle(context), maxLines: 2, overflow: TextOverflow.ellipsis),
      ),
    );
  }
}

/// Bottom sheet list with a search box for long lists (batches, departments). Safe-area aware, keyboard aware, scrolls on every phone.
class _PickerSheet extends StatefulWidget {
  const _PickerSheet({required this.label, required this.options, required this.value});
  final String label;
  final List<String> options;
  final String value;

  @override
  State<_PickerSheet> createState() => _PickerSheetState();
}

class _PickerSheetState extends State<_PickerSheet> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final shown = widget.options.where((o) => o.toLowerCase().contains(_q.toLowerCase())).toList();
    final height = MediaQuery.of(context).size.height;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: height * 0.7,
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
            child: Align(alignment: Alignment.centerLeft, child: Text(widget.label, style: displayStyle(context, 22))),
          ),
          if (widget.options.length > 10)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: TextField(
                onChanged: (v) => setState(() => _q = v),
                decoration: const InputDecoration(prefixIcon: Icon(Icons.search_rounded, size: 20), hintText: 'Search'),
              ),
            ),
          Expanded(
            child: shown.isEmpty
                ? Center(child: Text('Nothing found', style: bodyStyle(context, color: p.muted)))
                : ListView.builder(
                    padding: EdgeInsets.only(bottom: MediaQuery.of(context).padding.bottom + 8),
                    itemCount: shown.length,
                    itemBuilder: (_, i) {
                      final o = shown[i];
                      final sel = o == widget.value;
                      return ListTile(
                        minVerticalPadding: 14,
                        title: Text(o, style: bodyStyle(context, weight: sel ? FontWeight.w700 : FontWeight.w500)),
                        trailing: sel ? Icon(Icons.check_circle_rounded, color: p.tech) : null,
                        onTap: () => Navigator.pop(context, o),
                      );
                    },
                  ),
          ),
        ]),
      ),
    );
  }
}

/// Single-choice chip row (e.g. gender, level).
class ChoiceRow extends StatelessWidget {
  const ChoiceRow({super.key, required this.label, required this.options, required this.value, required this.onChanged, this.error});
  final String label;
  final List<String> options;
  final String value;
  final ValueChanged<String> onChanged;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label.toUpperCase(), style: monoStyle(context, size: 10.5)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final o in options)
          GestureDetector(
            onTap: () => onChanged(value == o ? '' : o),
            child: AnimatedContainer(
              duration: 200.ms,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                color: value == o ? p.accent.withValues(alpha: 0.2) : Colors.transparent,
                border: Border.all(color: value == o ? p.accent : p.line),
              ),
              child: Text(o, style: bodyStyle(context, size: 13.5, weight: FontWeight.w600, color: value == o ? p.fg : p.muted)),
            ),
          ),
      ]),
      if (error != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(error!, style: bodyStyle(context, size: 12, color: const Color(0xFFEF4444)))),
    ]);
  }
}

/// Picked profile photo (path + metadata kept for upload).
class PickedPhoto {
  PickedPhoto(this.path, this.name, this.mime);
  final String path;
  final String name;
  final String mime;
}

/// Choose or take a picture, crop / turn / adjust it in the editor, and get it back ready to upload (JPEG, under 3 MB).
Future<PickedPhoto?> pickPhoto(BuildContext context, {double? aspect, bool circle = false}) async {
  final r = await pickAndEdit(context, aspect: aspect, circle: circle, maxSide: 1600);
  if (r == null) return null;
  try {
    final size = await File(r.path).length();
    if (size > 3 * 1024 * 1024) {
      if (context.mounted) showSnack(context, 'Picture is too big. Choose Small or Medium size in the editor.', error: true);
      return null;
    }
  } catch (_) {
    return null;
  }
  return PickedPhoto(r.path, r.name, r.mime);
}

/// Circular photo slot with gradient ring.
class PhotoSlot extends StatelessWidget {
  const PhotoSlot({super.key, required this.photo, required this.onTap, this.size = 120, this.error, this.label = 'Add photo'});
  final PickedPhoto? photo;
  final VoidCallback onTap;
  final double size;
  final String? error;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Column(children: [
      GestureDetector(
        onTap: onTap,
        child: Container(
          width: size,
          height: size,
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand),
          child: Container(
            decoration: BoxDecoration(shape: BoxShape.circle, color: p.bg),
            clipBehavior: Clip.antiAlias,
            child: photo == null
                ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.add_a_photo_rounded, color: p.tech, size: size * 0.26),
                    const SizedBox(height: 4),
                    Text(label, style: bodyStyle(context, size: 12, color: p.muted)),
                  ])
                : Image.file(File(photo!.path), fit: BoxFit.cover, width: size, height: size),
          ),
        ),
      ).animate(onPlay: (c) => c.repeat(reverse: true)).scaleXY(begin: 1, end: 1.03, duration: 2.seconds, curve: Curves.easeInOut),
      if (error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(error!, style: bodyStyle(context, size: 12, color: const Color(0xFFEF4444)))),
    ]);
  }
}
