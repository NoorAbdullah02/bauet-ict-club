import '../../core/i18n.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/image_editor.dart';

/// Multi-word case-insensitive search matcher across any list of fields.
bool matchesQuery(String query, Iterable<Object?> fields) {
  final tokens = query.trim().toLowerCase().split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();
  if (tokens.isEmpty) return true;
  final hay = fields.map((f) => (f ?? '').toString().toLowerCase()).join(' ');
  return tokens.every(hay.contains);
}

/// Compact pill search bar styled consistently across all Flutter Admin screens.
class AdminSearchBar extends StatelessWidget {
  const AdminSearchBar({
    super.key,
    required this.controller,
    required this.hint,
    required this.onChanged,
    this.shown,
    this.total,
  });

  final TextEditingController controller;
  final String hint;
  final ValueChanged<String> onChanged;
  final int? shown;
  final int? total;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final hasQuery = controller.text.trim().isNotEmpty;
    return TextField(
      controller: controller,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      style: bodyStyle(context, size: 14),
      cursorColor: p.tech,
      decoration: InputDecoration(
        hintText: hint,
        isDense: true,
        filled: true,
        fillColor: p.surface.withValues(alpha: p.dark ? 0.72 : 0.92),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        prefixIcon: Icon(Icons.search_rounded, size: 20, color: p.accent),
        suffixIcon: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (hasQuery && shown != null && total != null)
              Container(
                margin: const EdgeInsets.only(right: 4),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: p.tech.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text('$shown/$total', style: monoStyle(context, size: 10, color: p.tech, weight: FontWeight.w700)),
              ),
            if (hasQuery)
              IconButton(
                tooltip: tr('Clear'),
                visualDensity: VisualDensity.compact,
                icon: Icon(Icons.close_rounded, size: 18, color: p.muted),
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
              ),
          ],
        ),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide(color: p.line)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide(color: p.line)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide(color: p.tech, width: 1.5)),
      ),
    );
  }
}

/// Light/dark toggle for the admin area (independent from the public theme).
class AdminThemeButton extends StatelessWidget {
  const AdminThemeButton({super.key});

  @override
  Widget build(BuildContext context) {
    final dark = context.select<AppState, bool>((s) => s.adminDark);
    return IconButton(
      tooltip: 'Toggle admin theme',
      onPressed: () {
        HapticFeedback.selectionClick();
        context.read<AppState>().toggleAdminTheme();
      },
      icon: Icon(dark ? Icons.light_mode_rounded : Icons.dark_mode_rounded),
    );
  }
}

/// Yes/No popup used before every approve, reject, delete or bulk action. Returns true only when the admin confirms.
Future<bool> confirmAction(BuildContext context, {required String title, String? message, String confirmText = 'Yes', bool danger = false}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: message == null ? null : Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(tr('Cancel'))),
        FilledButton(
          style: danger ? FilledButton.styleFrom(backgroundColor: const Color(0xFFE5484D)) : null,
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(confirmText),
        ),
      ],
    ),
  );
  return ok == true;
}

/// Picture field for admin forms: preview, "Choose & resize" (Small / Medium / Large) and a link box.
/// The picture is shrunk on the phone before upload, then stored through POST /api/upload.
class ImageUploadField extends StatefulWidget {
  const ImageUploadField({super.key, required this.controller, required this.label, this.kind = 'cover', this.error});
  final TextEditingController controller;
  final String label;
  final String kind; // avatar | cover | logo
  final String? error;

  @override
  State<ImageUploadField> createState() => _ImageUploadFieldState();
}

class _ImageUploadFieldState extends State<ImageUploadField> {
  bool _busy = false;

  Future<void> _choose() async {
    final state = context.read<AppState>();
    final avatar = widget.kind == 'avatar';
    final r = await pickAndEdit(context, aspect: avatar ? 1 : null, circle: avatar, maxSide: 1000);
    if (r == null || !mounted) return;
    try {
      setState(() => _busy = true);
      final url = await state.api.uploadAdminImage(r.path, r.name, r.mime, kind: widget.kind);
      if (mounted) {
        setState(() => widget.controller.text = url);
        showSnack(context, 'Picture uploaded');
      }
    } on ApiException catch (e) {
      await state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    } catch (_) {
      if (mounted) showSnack(context, 'Could not upload the picture', error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.controller.text.trim();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(widget.label, style: const TextStyle(fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      Row(children: [
        if (url.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(onTap: () => showPhoto(context, url), child: ClipRRect(borderRadius: BorderRadius.circular(12), child: SizedBox(width: 84, height: 84, child: NetImage(url)))),
          ),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: _busy ? null : _choose,
            icon: _busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.crop_rounded),
            label: Text(_busy ? 'Uploading…' : url.isEmpty ? 'Add & edit picture' : 'Change / edit picture'),
          ),
        ),
        if (url.isNotEmpty) IconButton(tooltip: 'Remove', onPressed: () => setState(() => widget.controller.clear()), icon: const Icon(Icons.close_rounded)),
      ]),
      const SizedBox(height: 8),
      AppField(controller: widget.controller, label: 'or paste a picture link', error: widget.error, onChanged: () => setState(() {})),
    ]);
  }
}
