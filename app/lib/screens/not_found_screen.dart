import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/i18n.dart';
import '../core/theme.dart';
import '../widgets/common.dart';
import '../widgets/lost_robot.dart';

/// Shown when a link goes nowhere, or when a page cannot be found. Friendly words, the address, and ways to carry on.
class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key, required this.path, this.title = 'We could not find this page', this.message = 'The link may be old or mistyped, or the page was moved.', this.code = '404'});
  final String path;
  final String title;
  final String message;
  final String code;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    const quick = [('Events', '/events', Icons.event_rounded), ('Jobs', '/jobs', Icons.work_rounded), ('Contests', '/contests', Icons.sports_esports_rounded), ('Team', '/team', Icons.groups_rounded), ('Notices', '/notices', Icons.campaign_rounded), ('Contact', '/contact', Icons.mail_rounded)];
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const LostRobot(size: 200),
                GradientText(code, style: displayStyle(context, 76, letterSpacing: -3)),
                const SizedBox(height: 6),
                Text(tr(title), textAlign: TextAlign.center, style: displayStyle(context, 24)),
                const SizedBox(height: 10),
                Text(tr(message), textAlign: TextAlign.center, style: bodyStyle(context, color: p.muted)),
                if (path.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: p.surface, border: Border.all(color: p.line)),
                    child: Text(path, maxLines: 1, overflow: TextOverflow.ellipsis, style: monoStyle(context, size: 11, color: p.muted)),
                  ),
                ],
                const SizedBox(height: 22),
                GradientButton(label: 'Go to the home page', icon: Icons.home_rounded, onPressed: () => context.go('/home')),
                const SizedBox(height: 10),
                GhostButton(label: 'Go back', icon: Icons.arrow_back_rounded, onPressed: () => context.canPop() ? context.pop() : context.go('/home')),
                const SizedBox(height: 26),
                Text(tr('Maybe you wanted').toUpperCase(), style: monoStyle(context, size: 10, color: p.muted)),
                const SizedBox(height: 10),
                Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.center, children: [
                  for (final q in quick)
                    ActionChip(
                      avatar: Icon(q.$3, size: 16, color: p.accent),
                      label: Text(tr(q.$1)),
                      onPressed: () => context.go(q.$2),
                    ),
                ]),
                const SizedBox(height: 16),
                TextButton(onPressed: () => context.go('/contact'), child: Text('${tr('Think this is a mistake?')} ${tr('Tell us')}')),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
