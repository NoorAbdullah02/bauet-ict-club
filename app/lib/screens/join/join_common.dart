import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/api.dart';
import '../../widgets/coder.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';

/// Result of a submit attempt: either ok, or field errors / a message.
class JoinResult {
  const JoinResult({this.ok = false, this.message, this.fields = const {}});
  final bool ok;
  final String? message;
  final Map<String, String> fields;
}

/// Uploads the optional photo, then posts the registration. Never throws.
Future<JoinResult> submitJoin(Api api, Map<String, dynamic> body, PickedPhoto? photo) async {
  try {
    if (photo != null) {
      body['photo_url'] = await api.uploadPhoto(photo.path, photo.name, photo.mime);
    }
    await api.submitRegistration(body);
    return const JoinResult(ok: true);
  } on ApiException catch (e) {
    if (e.status == 409) return JoinResult(message: e.message.isEmpty ? 'You have already applied.' : e.message);
    return JoinResult(message: e.message, fields: e.fields);
  } catch (e) {
    return JoinResult(message: e.toString());
  }
}

class JoinSuccess extends StatelessWidget {
  const JoinSuccess({super.key, required this.title, required this.message});
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 110,
            height: 110,
            decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand, boxShadow: [BoxShadow(color: p.accent.withValues(alpha: 0.5), blurRadius: 40)]),
            child: const Icon(Icons.check_rounded, size: 60, color: Colors.white),
          ).animate().scale(begin: const Offset(0, 0), duration: 700.ms, curve: Curves.elasticOut),
          const SizedBox(height: 28),
          Text(title, textAlign: TextAlign.center, style: displayStyle(context, 32)).animate().fadeIn(delay: 300.ms).slideY(begin: 0.2, end: 0),
          const SizedBox(height: 10),
          Text(message, textAlign: TextAlign.center, style: bodyStyle(context, color: p.muted)).animate().fadeIn(delay: 450.ms),
          const SizedBox(height: 28),
          GradientButton(label: 'Back to home', icon: Icons.home_rounded, expand: false, onPressed: () => context.go('/home')).animate().fadeIn(delay: 650.ms),
        ]),
      ),
    );
  }
}

/// Header bar for join flows (back button + title).
class JoinTopBar extends StatelessWidget {
  const JoinTopBar({super.key, required this.title, this.eyebrow});
  final String title;
  final String? eyebrow;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Row(children: [
      IconButton.filledTonal(
        style: IconButton.styleFrom(backgroundColor: p.surface.withValues(alpha: 0.8), foregroundColor: p.fg),
        onPressed: () => context.canPop() ? context.pop() : context.go('/join'),
        icon: const Icon(Icons.arrow_back_rounded),
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (eyebrow != null) CodeLabel(eyebrow!),
          Text(title, style: displayStyle(context, 22)),
        ]),
      ),
    ]);
  }
}
