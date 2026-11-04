import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/app_state.dart';
import '../widgets/coder.dart';
import '../widgets/common.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final s = state.settings;
    final p = context.pal;
    Widget block(String label, IconData icon, String text) => text.isEmpty
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: GlassCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [Icon(icon, size: 18, color: p.tech), const SizedBox(width: 8), CodeLabel(label)]),
                const SizedBox(height: 10),
                Text(text, style: bodyStyle(context, color: p.muted, size: 14.5)),
              ]),
            ),
          );

    return RefreshIndicator(
      color: p.tech,
      onRefresh: state.loadAll,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Who we are', title: 'About the club').stagger(0),
          const SizedBox(height: 20),
          const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            LogoImage.crest(height: 80),
            SizedBox(width: 22),
            LogoImage.club(height: 70),
          ]).stagger(1),
          const SizedBox(height: 24),
          if (state.loading && !state.loadedOnce)
            const ShimmerList(count: 3, height: 120)
          else ...[
            block('about', Icons.terminal_rounded, s.aboutText),
            block('mission', Icons.flag_rounded, s.mission),
            block('vision', Icons.visibility_rounded, s.vision),
            block('goal', Icons.track_changes_rounded, s.goal),
            if (s.aboutText.isEmpty && s.mission.isEmpty && s.vision.isEmpty && s.goal.isEmpty)
              const EmptyState(icon: Icons.info_outline_rounded, title: 'No details yet'),
          ],
        ],
      ),
    );
  }
}
