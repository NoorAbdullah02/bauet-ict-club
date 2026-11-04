import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';

import '../core/theme.dart';
import '../core/utils.dart';

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

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return TextField(
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
        labelText: label,
        hintText: hint,
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
      builder: (ctx) {
        final p = ctx.pal;
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.35,
          builder: (_, scroll) => Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
              child: Align(alignment: Alignment.centerLeft, child: Text(label, style: displayStyle(ctx, 22))),
            ),
            Expanded(
              child: ListView.builder(
                controller: scroll,
                itemCount: options.length,
                itemBuilder: (_, i) {
                  final o = options[i];
                  final sel = o == value;
                  return ListTile(
                    title: Text(o, style: bodyStyle(ctx, weight: sel ? FontWeight.w700 : FontWeight.w500)),
                    trailing: sel ? Icon(Icons.check_circle_rounded, color: p.tech) : null,
                    onTap: () => Navigator.pop(ctx, o),
                  );
                },
              ),
            ),
          ]),
        );
      },
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

Future<PickedPhoto?> pickPhoto(BuildContext context) async {
  try {
    final x = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1600, imageQuality: 88);
    if (x == null) return null;
    final lower = x.name.toLowerCase();
    final isPng = lower.endsWith('.png');
    final isJpg = lower.endsWith('.jpg') || lower.endsWith('.jpeg');
    if (!isPng && !isJpg) {
      if (context.mounted) showSnack(context, 'Please choose a JPG or PNG image', error: true);
      return null;
    }
    final size = await File(x.path).length();
    if (size > 3 * 1024 * 1024) {
      if (context.mounted) showSnack(context, 'Photo must be 3MB or smaller', error: true);
      return null;
    }
    return PickedPhoto(x.path, x.name, isPng ? 'image/png' : 'image/jpeg');
  } catch (_) {
    if (context.mounted) showSnack(context, 'Could not open the gallery', error: true);
    return null;
  }
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
