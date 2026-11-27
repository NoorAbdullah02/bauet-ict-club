import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/coder.dart';
import '../widgets/common.dart';

class AmbassadorsScreen extends StatefulWidget {
  const AmbassadorsScreen({super.key});

  @override
  State<AmbassadorsScreen> createState() => _AmbassadorsScreenState();
}

class _AmbassadorsScreenState extends State<AmbassadorsScreen> {
  String _dept = 'All';

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final p = context.pal;
    final all = state.ambassadors;
    final filtered = all.where((m) => _dept == 'All' || m.department == _dept).toList();
    final sessions = filtered.map((m) => m.session).toSet().toList()..sort((a, b) => sessionRank(b).compareTo(sessionRank(a)));

    return RefreshIndicator(
      color: p.tech,
      onRefresh: state.loadAll,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Campus voices', title: 'Department ambassadors', subtitle: 'One representative per department.').stagger(0),
          const SizedBox(height: 16),
          SizedBox(
            height: 42,
            child: ListView(scrollDirection: Axis.horizontal, children: [
              for (final d in ['All', ...kAmbassadorDepartments])
                Padding(padding: const EdgeInsets.only(right: 10), child: PillChip(label: d, selected: d == _dept, onTap: () => setState(() => _dept = d))),
            ]),
          ),
          const SizedBox(height: 18),
          if (state.loading && !state.loadedOnce)
            const ShimmerList(count: 3, height: 150)
          else if (state.error != null && state.members.isEmpty)
            ErrorState(message: state.error!, onRetry: state.loadAll)
          else if (filtered.isEmpty)
            Column(children: [
              const EmptyState(icon: Icons.school_outlined, title: 'No ambassadors yet', message: 'Be the first voice of your department.'),
              GradientButton(label: 'Become an ambassador', icon: Icons.school_rounded, onPressed: () => context.push('/join/ambassador')),
            ])
          else
            for (final s in sessions) _SessionBlock(session: s, members: filtered.where((m) => m.session == s).toList()),
        ],
      ),
    );
  }
}

class _SessionBlock extends StatelessWidget {
  const _SessionBlock({required this.session, required this.members});
  final String session;
  final List<Member> members;

  @override
  Widget build(BuildContext context) {
    final sorted = [...members]..sort((a, b) => kAmbassadorDepartments.indexOf(a.department).compareTo(kAmbassadorDepartments.indexOf(b.department)));
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        CodeLabel(session.isEmpty ? 'session' : session),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: sorted.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: 0.8),
          itemBuilder: (_, i) => _AmbassadorCard(member: sorted[i]).stagger(i % 6),
        ),
      ]),
    );
  }
}

class _AmbassadorCard extends StatelessWidget {
  const _AmbassadorCard({required this.member});
  final Member member;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GlassCard(
      padding: const EdgeInsets.all(14),
      child: Column(children: [
        Expanded(
          child: AspectRatio(
            aspectRatio: 1,
            child: Container(
              padding: const EdgeInsets.all(2.5),
              decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand),
              child: ClipOval(
                child: NetImage(
                  AppConfig.portrait(member.imageUrl, 240),
                  fallbackLabel: member.name,
                  alignment: const Alignment(0, -0.35),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(member.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700, size: 14)),
        const SizedBox(height: 4),
        Tag(member.department.isEmpty ? 'Dept' : member.department, color: p.tech),
        if (member.batch.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text('Batch ${member.batch}', style: monoStyle(context, size: 9.5))),
      ]),
    );
  }
}
