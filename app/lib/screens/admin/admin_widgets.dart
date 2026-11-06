import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/image_editor.dart';

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
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
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
            child: ClipRRect(borderRadius: BorderRadius.circular(12), child: SizedBox(width: 64, height: 64, child: NetImage(url))),
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
