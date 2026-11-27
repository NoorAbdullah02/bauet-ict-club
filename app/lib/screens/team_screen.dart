import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  late final AppState _state = context.read<AppState>();
  String? _session;
  String? _currentSession;

  @override
  void initState() {
    super.initState();
    // the admin-marked session from /api/settings, refined by is_current from /api/committees
    _currentSession = _state.settings.currentSession;
    _loadCurrent();
    // an admin may have changed a photo or a post since the app was opened: refresh quietly, no spinner
    _state.reloadMembers();
  }

  Future<void> _loadCurrent() async {
    try {
      final rows = await _state.api.committees();
      String? marked;
      for (final r in rows) {
        if (r['is_current'] == true && '${r['label']}'.trim().isNotEmpty) marked = '${r['label']}';
      }
      if (marked != null && mounted) setState(() => _currentSession = marked);
    } on ApiException catch (_) {
      // keep the session from settings, and the newest one as the last resort
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final p = context.pal;
    final s = state.settings;

    final sessions = state.teamMembers.map((m) => m.session).where((s) => s.isNotEmpty).toSet().toList()
      ..sort((a, b) => sessionRank(b).compareTo(sessionRank(a)));
    final active = (_session != null && sessions.contains(_session))
        ? _session
        : (_currentSession != null && sessions.contains(_currentSession))
            ? _currentSession
            : (sessions.isEmpty ? null : sessions.first);

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
          SectionHeader(eyebrow: s.pageText('teamTag', 'The people'), title: s.pageText('teamTitle', 'Executive committee'), subtitle: s.pageText('teamDesc', 'The team that runs BAUET ICT Club.')).stagger(0),
          const SizedBox(height: 18),
          if (state.advisors.isNotEmpty) ...[
            _AdvisorsSection(advisors: state.advisors),
            const SizedBox(height: 26),
          ],
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
              Row(children: [
                Icon(Icons.workspace_premium_rounded, size: 16, color: p.tech),
                const SizedBox(width: 8),
                Text('LEADERSHIP', style: monoStyle(context, size: 11, color: p.tech)),
              ]),
              const SizedBox(height: 12),
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
      onTap: () => context.push('/member/${member.id}'),
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
          child: ClipOval(child: SizedBox(width: 92, height: 92, child: NetImage(AppConfig.portrait(member.imageUrl, 230), fallbackLabel: member.name, alignment: _faceFrame))),
        ),
        const SizedBox(width: 18),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: p.tech.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: p.tech.withValues(alpha: 0.35)),
              ),
              child: Text(member.position, maxLines: 2, style: bodyStyle(context, size: 11.5, weight: FontWeight.w600, color: p.tech, height: 1.25)),
            ),
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

/// Circle photos of people: keep the frame a little above the middle so a tall picture shows the face, not the chin
/// (the website uses the same rule).
const Alignment _faceFrame = Alignment(0, -0.35);

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
      onTap: () => context.push('/member/${member.id}'),
      child: Column(children: [
        Expanded(
          child: AspectRatio(
            aspectRatio: 1,
            child: Container(
              padding: const EdgeInsets.all(2.5),
              decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand),
              child: ClipOval(child: NetImage(AppConfig.portrait(member.imageUrl, 180), fallbackLabel: member.name, alignment: _faceFrame)),
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


/// The club's advisors above the committee: photo ring, role, title and department; tap for the membership card.
class _AdvisorsSection extends StatelessWidget {
  const _AdvisorsSection({required this.advisors});
  final List<Advisor> advisors;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final s = context.watch<AppState>().settings;
    final chief = advisors.where((a) => a.designation.toLowerCase().contains('chief')).cast<Advisor?>().firstWhere((_) => true, orElse: () => null);
    final others = advisors.where((a) => a != chief).toList();
    // the width comes from the layout, so a narrow phone never cuts a card off the screen edge
    Widget card(Advisor a, bool big, double width) => GestureDetector(
                      onTap: () => context.push('/member/a${a.id}'),
          child: Container(
            width: width,
            padding: EdgeInsets.fromLTRB(14, big ? 20 : 16, 14, 14),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: big ? p.accent.withValues(alpha: 0.5) : p.line),
              boxShadow: p.dark ? null : [BoxShadow(color: Colors.black.withValues(alpha: big ? 0.1 : 0.06), blurRadius: big ? 26 : 20, offset: const Offset(0, 8))],
            ),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: big ? 116 : 84,
                height: big ? 116 : 84,
                padding: const EdgeInsets.all(3),
                decoration: const BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [Color(0xFF35D989), Color(0xFF38C8F0), Color(0xFF8B5CF6)])),
                child: ClipOval(
                  child: a.imageUrl.isEmpty
                      ? Container(color: const Color(0xFF0B2A78), alignment: Alignment.center, child: Text(a.name.trim().isEmpty ? '?' : initialsOf(a.name), style: displayStyle(context, big ? 40 : 30, color: Colors.white)))
                      : NetImage(AppConfig.portrait(a.imageUrl, 230), fit: BoxFit.cover, alignment: _faceFrame),
                ),
              ),
              const SizedBox(height: 10),
              Tag(a.designation, color: p.tech),
              const SizedBox(height: 6),
              Text(a.name, maxLines: 2, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis, style: displayStyle(context, big ? 20 : 16, height: 1.15)),
              if (a.rankTitle.isNotEmpty) Text(a.rankTitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12, color: p.muted)),
              if (a.department.isNotEmpty) Text(a.department, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 11.5, color: p.muted)),
            ]),
          ),
        );
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(Icons.school_rounded, size: 16, color: p.tech),
        const SizedBox(width: 8),
        Text(s.pageText('teamAdvisorsTag', 'Our advisors').toUpperCase(), style: monoStyle(context, size: 11, color: p.tech)),
      ]),
      const SizedBox(height: 4),
      Text(s.pageText('teamAdvisors', 'Guided by experience'), style: displayStyle(context, 24)),
      const SizedBox(height: 14),
      if (chief != null)
        LayoutBuilder(builder: (context, c) => Center(child: card(chief, true, c.maxWidth < 270 ? c.maxWidth : 270))),
      if (chief != null && others.isNotEmpty) const SizedBox(height: 14),
      if (others.isNotEmpty)
        LayoutBuilder(builder: (context, c) {
          const gap = 14.0;
          // 1 card on a small phone, 2 on a phone/tablet, 3 on a wide screen: every card stays fully visible
          final perRow = c.maxWidth >= 620 ? 3 : (c.maxWidth >= 330 ? 2 : 1);
          final w = (c.maxWidth - gap * (perRow - 1)) / perRow;
          // full width, so two cards on a wide screen sit centred under the chief instead of hugging the left edge
          return SizedBox(width: double.infinity, child: Wrap(alignment: WrapAlignment.center, spacing: gap, runSpacing: gap, children: [for (final a in others) card(a, false, w)]));
        }),
    ]);
  }
}
