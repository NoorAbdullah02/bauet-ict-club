import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

IconData _iconFor(String name) {
  switch (name.toLowerCase()) {
    case 'award':
    case 'medal':
      return Icons.military_tech_rounded;
    case 'star':
      return Icons.star_rounded;
    case 'code':
      return Icons.code_rounded;
    case 'users':
    case 'team':
      return Icons.groups_rounded;
    case 'rocket':
      return Icons.rocket_launch_rounded;
    case 'zap':
      return Icons.bolt_rounded;
    case 'target':
      return Icons.track_changes_rounded;
    default:
      return Icons.emoji_events_rounded;
  }
}

class AchievementsScreen extends StatelessWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final p = context.pal;
    final list = [...state.achievements]..sort((a, b) => (b.date ?? DateTime(2000)).compareTo(a.date ?? DateTime(2000)));
    return RefreshIndicator(
      color: p.tech,
      onRefresh: state.loadAll,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Milestones', title: 'Achievements', subtitle: 'What we have accomplished together.').stagger(0),
          const SizedBox(height: 22),
          if (state.loading && !state.loadedOnce)
            const ShimmerList(count: 4, height: 100)
          else if (state.error != null && state.achievements.isEmpty)
            ErrorState(message: state.error!, onRetry: state.loadAll)
          else if (list.isEmpty)
            const EmptyState(icon: Icons.emoji_events_outlined, title: 'Nothing yet')
          else
            for (var i = 0; i < list.length; i++) _Row(item: list[i], last: i == list.length - 1).stagger(i),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.item, required this.last});
  final Achievement item;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Column(children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand, boxShadow: [BoxShadow(color: p.accent.withValues(alpha: 0.4), blurRadius: 16)]),
            child: Icon(_iconFor(item.icon), color: Colors.white, size: 22),
          ),
          if (!last) Expanded(child: Container(width: 2, margin: const EdgeInsets.symmetric(vertical: 4), color: p.line)),
        ]),
        const SizedBox(width: 16),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: last ? 0 : 22),
            child: GlassCard(
              padding: const EdgeInsets.all(18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (item.imageUrl.isNotEmpty) ...[
                  ClipRRect(borderRadius: BorderRadius.circular(14), child: SizedBox(height: 150, width: double.infinity, child: NetImage(item.imageUrl, fallbackLabel: item.title))),
                  const SizedBox(height: 12),
                ],
                Text(fmtDate(item.date).toUpperCase(), style: monoStyle(context, color: p.tech, size: 10)),
                const SizedBox(height: 6),
                Text(item.title, style: displayStyle(context, 19)),
                if (item.description.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(item.description, style: bodyStyle(context, color: p.muted, size: 13.5)),
                ],
              ]),
            ),
          ),
        ),
      ]),
    );
  }
}
