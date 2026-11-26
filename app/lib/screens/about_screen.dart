import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/app_state.dart';
import '../widgets/coder.dart';
import '../widgets/common.dart';

/// The same activity tiles the website shows under "What We Do".
const List<(IconData, String, String)> _activities = [
  (Icons.code_rounded, 'Workshops', 'Hands-on coding sessions'),
  (Icons.emoji_events_rounded, 'Hackathons', 'Competitive innovation'),
  (Icons.menu_book_rounded, 'Tech Talks', 'Expert knowledge sharing'),
  (Icons.lightbulb_outline_rounded, 'Projects', 'Real-world development'),
  (Icons.groups_rounded, 'Competitions', 'National & international'),
  (Icons.public_rounded, 'Community', 'Network of innovators'),
  (Icons.memory_rounded, 'Mentorship', 'Guidance from seniors'),
  (Icons.rocket_launch_rounded, 'Networking', 'Industry connections'),
];

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
          SectionHeader(eyebrow: s.pageText('aboutTag', 'Who we are'), title: s.pageText('aboutTitle', 'About the club')).stagger(0),
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
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Icon(Icons.handyman_rounded, size: 18, color: p.tech),
                  const SizedBox(width: 8),
                  Expanded(child: Text(s.pageText('aboutWhatWeDo', 'What We Do'), style: displayStyle(context, 22))),
                ]),
                const SizedBox(height: 6),
                Text(s.pageText('aboutWhatWeDoSub', 'Activities that shape future tech leaders'), style: bodyStyle(context, color: p.muted, size: 13.5)),
                const SizedBox(height: 14),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _activities.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, mainAxisExtent: 64),
                  itemBuilder: (context, i) => _ActivityCard(activity: _activities[i]),
                ),
              ]),
            ).stagger(4),
          ],
        ],
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.activity});
  final (IconData, String, String) activity;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: p.tech.withValues(alpha: 0.14)),
          child: Icon(activity.$1, size: 18, color: p.tech),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(activity.$2, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700, size: 13)),
            Text(activity.$3, maxLines: 2, overflow: TextOverflow.ellipsis, style: bodyStyle(context, color: p.muted, size: 11.5, height: 1.25)),
          ]),
        ),
      ]),
    );
  }
}
