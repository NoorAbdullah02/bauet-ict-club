import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  String _status = 'All';

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final p = context.pal;
    final list = state.projects.where((x) => _status == 'All' || x.status.toLowerCase() == _status.toLowerCase()).toList()
      ..sort((a, b) => a.featured == b.featured ? 0 : (a.featured ? -1 : 1));
    return RefreshIndicator(
      color: p.tech,
      onRefresh: state.loadAll,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Built by members', title: 'Projects', subtitle: 'Things we are shipping.').stagger(0),
          const SizedBox(height: 16),
          SizedBox(
            height: 42,
            child: ListView(scrollDirection: Axis.horizontal, children: [
              for (final s in const ['All', 'Active', 'Completed', 'Planning'])
                Padding(padding: const EdgeInsets.only(right: 10), child: PillChip(label: s, selected: _status == s, onTap: () => setState(() => _status = s))),
            ]),
          ),
          const SizedBox(height: 18),
          if (state.loading && !state.loadedOnce)
            const ShimmerList(count: 3, height: 220)
          else if (state.error != null && state.projects.isEmpty)
            ErrorState(message: state.error!, onRetry: state.loadAll)
          else if (list.isEmpty)
            const EmptyState(icon: Icons.code_rounded, title: 'No projects yet')
          else
            for (var i = 0; i < list.length; i++) Padding(padding: const EdgeInsets.only(bottom: 16), child: _ProjectCard(project: list[i]).stagger(i)),
        ],
      ),
    );
  }
}

Color _statusColor(Pal p, String s) {
  switch (s.toLowerCase()) {
    case 'completed':
      return p.tech;
    case 'planning':
      return const Color(0xFFFFC857);
    default:
      return p.accent;
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project});
  final ProjectItem project;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final x = project;
    return GlassCard(
      padding: EdgeInsets.zero,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (x.imageUrl.isNotEmpty) SizedBox(height: 150, width: double.infinity, child: NetImage(x.imageUrl, fallbackLabel: x.title)),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Tag(x.status, color: _statusColor(p, x.status)),
                if (x.featured) ...[const SizedBox(width: 8), const Tag('Featured', icon: Icons.star_rounded, color: Color(0xFFFFC857))],
              ]),
              const SizedBox(height: 10),
              Text(x.title, style: displayStyle(context, 21)),
              if (x.summary.isNotEmpty) ...[const SizedBox(height: 6), Text(x.summary, style: bodyStyle(context, color: p.muted, size: 13.5))],
              if (x.tech.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  for (final t in x.tech)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: p.line)),
                      child: Text(t, style: monoStyle(context, size: 10.5, color: p.fg)),
                    ),
                ]),
              ],
              if (x.team.isNotEmpty) ...[
                const SizedBox(height: 10),
                Row(children: [Icon(Icons.groups_rounded, size: 15, color: p.muted), const SizedBox(width: 6), Expanded(child: Text(x.team, style: bodyStyle(context, size: 12.5, color: p.muted)))]),
              ],
              if (x.liveUrl.isNotEmpty || x.repoUrl.isNotEmpty) ...[
                const SizedBox(height: 14),
                Wrap(spacing: 10, runSpacing: 8, children: [
                  if (x.liveUrl.isNotEmpty) FilledButton.icon(onPressed: () => openUrl(context, normalizeLink(x.liveUrl)), icon: const Icon(Icons.open_in_new_rounded, size: 17), label: const Text('Live')),
                  if (x.repoUrl.isNotEmpty) OutlinedButton.icon(onPressed: () => openUrl(context, normalizeLink(x.repoUrl)), icon: const Icon(Icons.code_rounded, size: 17), label: const Text('Code')),
                ]),
              ],
            ]),
          ),
        ]),
      ),
    );
  }
}
