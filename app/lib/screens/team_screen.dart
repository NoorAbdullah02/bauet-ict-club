import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  String? _session;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final p = context.pal;

    final sessions = state.teamMembers.map((m) => m.session).where((s) => s.isNotEmpty).toSet().toList()
      ..sort((a, b) => sessionRank(b).compareTo(sessionRank(a)));
    final active = (_session != null && sessions.contains(_session)) ? _session : (sessions.isEmpty ? null : sessions.first);

    List<Member> pick(bool Function(Member) test) =>
        state.teamMembers.where((m) => (active == null || m.session == active) && test(m)).toList()..sort((a, b) => a.order.compareTo(b.order));

    int rank(Member m) {
      final p = m.position.toLowerCase();
      if (p.trim() == 'president') return 0;
      if (p.contains('administration')) return 1;
      if (p.contains('technical')) return 2;
      return 3;
    }

    final leaders = pick((m) => m.isLeader)..sort((a, b) => rank(a) != rank(b) ? rank(a).compareTo(rank(b)) : a.order.compareTo(b.order));
    final core = pick((m) => m.isCore);
    final chiefs = pick((m) => m.isChief);
    final execs = pick((m) => m.isExecutive);

    return RefreshIndicator(
      color: p.tech,
      onRefresh: state.loadAll,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'The people', title: 'Executive committee', subtitle: 'The team that runs BAUET ICT Club.').stagger(0),
          const SizedBox(height: 18),
          if (sessions.isNotEmpty)
            SizedBox(
              height: 42,
              child: ListView(scrollDirection: Axis.horizontal, children: [
                for (final s in sessions)
                  Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: PillChip(label: s, selected: s == active, onTap: () => setState(() => _session = s)),
                  ),
              ]),
            ),
          const SizedBox(height: 20),
          if (state.loading && !state.loadedOnce)
            const ShimmerList(count: 3, height: 200)
          else if (state.error != null && state.teamMembers.isEmpty)
            ErrorState(message: state.error!, onRetry: state.loadAll)
          else if (state.teamMembers.isEmpty)
            const EmptyState(icon: Icons.groups_outlined, title: 'No members yet')
          else ...[
            if (leaders.isNotEmpty) ...[
              for (var i = 0; i < leaders.length; i++)
                Padding(padding: const EdgeInsets.only(bottom: 16), child: _LeaderCard(member: leaders[i]).stagger(i)),
            ],
            if (core.isNotEmpty) _Group(title: 'Core committee', members: core),
            if (chiefs.isNotEmpty) _Group(title: 'Chief executives', members: chiefs),
            if (execs.isNotEmpty) _Group(title: 'Executive members', members: execs),
          ],
        ],
      ),
    );
  }
}

class _LeaderCard extends StatelessWidget {
  const _LeaderCard({required this.member});
  final Member member;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GestureDetector(
      onTap: () => context.push('/card/${member.id}'),
      child: Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(32),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [p.accent.withValues(alpha: p.dark ? 0.35 : 0.14), p.tech.withValues(alpha: p.dark ? 0.2 : 0.1)],
        ),
        border: Border.all(color: p.line),
      ),
      padding: const EdgeInsets.all(18),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand),
          child: ClipOval(child: SizedBox(width: 92, height: 92, child: NetImage(member.imageUrl, fallbackLabel: member.name))),
        ),
        const SizedBox(width: 18),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Tag(member.position, color: p.tech),
            const SizedBox(height: 10),
            Text(member.name, style: displayStyle(context, 22)),
            const SizedBox(height: 4),
            Text(_meta(member), style: bodyStyle(context, size: 12.5, color: p.muted)),
            const SizedBox(height: 8),
            _Socials(member: member),
          ]),
        ),
      ]),
    ));
  }
}

String _meta(Member m) => [m.department, if (m.batch.isNotEmpty) 'Batch ${m.batch}'].where((e) => e.isNotEmpty).join(' · ');

class _Group extends StatelessWidget {
  const _Group({required this.title, required this.members});
  final String title;
  final List<Member> members;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 14, bottom: 6),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title.toUpperCase(), style: monoStyle(context, color: context.pal.tech)),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: members.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: 0.78),
          itemBuilder: (_, i) => _MemberCard(member: members[i]).stagger(i % 6),
        ),
      ]),
    );
  }
}

class _MemberCard extends StatelessWidget {
  const _MemberCard({required this.member});
  final Member member;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GlassCard(
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/card/${member.id}'),
      child: Column(children: [
        Expanded(
          child: AspectRatio(
            aspectRatio: 1,
            child: Container(
              padding: const EdgeInsets.all(2.5),
              decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand),
              child: ClipOval(child: NetImage(member.imageUrl, fallbackLabel: member.name)),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(member.name, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: bodyStyle(context, weight: FontWeight.w700, size: 14)),
        const SizedBox(height: 2),
        Text(member.position, maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: bodyStyle(context, size: 11.5, color: p.muted, height: 1.3)),
        const SizedBox(height: 6),
        _Socials(member: member, center: true),
      ]),
    );
  }
}

class _Socials extends StatelessWidget {
  const _Socials({required this.member, this.center = false});
  final Member member;
  final bool center;

  @override
  Widget build(BuildContext context) {
    final links = <(IconData, String)>[
      if (member.fb.isNotEmpty) (Icons.facebook_rounded, member.fb),
      if (member.gh.isNotEmpty) (Icons.code_rounded, member.gh),
      if (member.li.isNotEmpty) (Icons.work_outline_rounded, member.li),
    ];
    if (links.isEmpty) return const SizedBox(height: 4);
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: center ? MainAxisAlignment.center : MainAxisAlignment.start,
      children: [
        for (final l in links)
          GestureDetector(
            onTap: () => openUrl(context, normalizeLink(l.$2)),
            child: Padding(padding: const EdgeInsets.only(right: 10), child: Icon(l.$1, size: 18, color: context.pal.tech)),
          ),
      ],
    );
  }
}
