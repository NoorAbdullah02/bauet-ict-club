import '../../core/i18n.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/coder.dart';
import '../../widgets/charts.dart';
import '../../widgets/common.dart';
import 'admin_widgets.dart';

class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  int _pending = 0;
  int _committee = 0;
  int _general = 0;
  int _messages = 0;
  int _ambassador = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final state = context.read<AppState>();
    setState(() => _loading = true);
    try {
      final regs = await state.api.list('registrations', fresh: true);
      final msgs = await state.api.list('messages', fresh: true);
      if (!mounted) return;
      setState(() {
        _pending =
            regs.where((r) => (r['status'] ?? 'pending') == 'pending').length;
        _committee = regs.where((r) => r['type'] == 'committee').length;
        _general = regs.where((r) => r['type'] == 'general').length;
        _ambassador = regs.where((r) => r['type'] == 'ambassador').length;
        _messages = msgs.length;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      await state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final state = context.watch<AppState>();

    Widget stat(String label, int v, IconData icon, Color c) => Expanded(
          child: GlassCard(
            padding: const EdgeInsets.all(16),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(icon, color: c, size: 22),
              const SizedBox(height: 10),
              _loading
                  ? const ShimmerBox(width: 40, height: 28, radius: 8)
                  : CountUp(value: v, style: displayStyle(context, 30)),
              const SizedBox(height: 2),
              Text(label.toUpperCase(), style: monoStyle(context, size: 9.5)),
            ]),
          ),
        );

    Widget nav(String title, String sub, IconData icon, String path,
            {Color? c, bool edit = true}) =>
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GlassCard(
            onTap: () => context.push(path),
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    color: (c ?? p.accent).withValues(alpha: 0.15)),
                child: Icon(icon, color: c ?? p.accent),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          style: bodyStyle(context,
                              weight: FontWeight.w700, size: 15.5)),
                      Text(sub,
                          style:
                              bodyStyle(context, size: 12.5, color: p.muted)),
                    ]),
              ),
              const SizedBox(width: 8),
              // a pencil means this area has an add/edit/delete screen behind it
              if (edit)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(9),
                    color: p.tech.withValues(alpha: 0.12),
                    border: Border.all(color: p.tech.withValues(alpha: 0.3)),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.edit_rounded, size: 12, color: p.tech),
                    const SizedBox(width: 5),
                    Text('EDIT',
                        style: monoStyle(context, size: 9, color: p.tech)),
                  ]),
                )
              else
                Icon(Icons.chevron_right_rounded, color: p.muted),
            ]),
          ),
        );

    Widget group(String label) => Padding(
          padding: const EdgeInsets.only(top: 12, bottom: 10),
          child: Row(children: [
            Text(label, style: monoStyle(context, size: 10, color: p.tech)),
            const SizedBox(width: 10),
            Expanded(child: Container(height: 1, color: p.line)),
          ]),
        );

    /// Who is signed in, and exactly what that role may touch (the server decides both).
    Widget roleCard(AppState state) {
      final superAdmin = state.isSuperAdmin;
      final editor = state.isEditor;
      final color = superAdmin
          ? p.accent
          : editor
              ? p.third
              : p.tech;
      final label = superAdmin
          ? 'MAIN ADMIN'
          : editor
              ? 'EDITOR'
              : 'ADMIN';
      final icon = superAdmin
          ? Icons.verified_user_rounded
          : editor
              ? Icons.edit_note_rounded
              : Icons.admin_panel_settings_rounded;
      final line = superAdmin
          ? 'Every area: content, people, trash, logins, downloads and backups.'
          : editor
              ? 'Can add and edit content and forms. Trash, activity log, downloads, committees, logins and backups stay with the main admin.'
              : 'Everything except the activity log, team logins and backups, which only the main admin can open.';
      return GlassCard(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                color: color.withValues(alpha: 0.15)),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(7),
                    color: color.withValues(alpha: 0.14),
                    border: Border.all(color: color.withValues(alpha: 0.35)),
                  ),
                  child: Text(label,
                      style: monoStyle(context, size: 9.5, color: color)),
                ),
                if ((state.adminName ?? '').isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Flexible(
                      child: Text('@${state.adminName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              bodyStyle(context, size: 12.5, color: p.muted))),
                ],
              ]),
              const SizedBox(height: 4),
              Text(line, style: bodyStyle(context, size: 12, color: p.muted)),
            ]),
          ),
        ]),
      );
    }

    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: RefreshIndicator(
            color: p.tech,
            onRefresh: () async {
              await _load();
              await state.loadAll();
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                Row(children: [
                  IconButton.filledTonal(
                    style: IconButton.styleFrom(
                        backgroundColor: p.surface.withValues(alpha: 0.8),
                        foregroundColor: p.fg),
                    onPressed: () =>
                        context.canPop() ? context.pop() : context.go('/home'),
                    icon: const Icon(Icons.arrow_back_rounded),
                  ),
                  const Spacer(),
                  const AdminThemeButton(),
                  TextButton.icon(
                    onPressed: () async {
                      await state.logout();
                      if (context.mounted) context.go('/home');
                    },
                    icon: const Icon(Icons.logout_rounded, size: 18),
                    label: const Text('Sign out'),
                  ),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  const LogoImage.club(height: 44),
                  const SizedBox(width: 14),
                  Text(tr('Admin'), style: displayStyle(context, 32)),
                ]).stagger(0),
                const SizedBox(height: 10),
                roleCard(state).stagger(0),
                const SizedBox(height: 22),
                Row(children: [
                  stat('Pending', _pending, Icons.hourglass_top_rounded,
                      const Color(0xFFFFC857)),
                  const SizedBox(width: 12),
                  stat('Messages', _messages, Icons.mail_rounded, p.tech),
                ]).stagger(1),
                const SizedBox(height: 12),
                Row(children: [
                  stat('Committee apps', _committee,
                      Icons.workspace_premium_rounded, p.accent),
                  const SizedBox(width: 12),
                  stat('General apps', _general, Icons.bolt_rounded, p.third),
                ]).stagger(2),
                const SizedBox(height: 26),
                Text('MANAGE EVERYTHING', style: monoStyle(context)),
                const SizedBox(height: 4),
                Text(
                  'The areas your role can open, add to and edit. The pencil marks the ones with an editor.',
                  style: bodyStyle(context, size: 12.5, color: p.muted),
                ),
                const SizedBox(height: 12),
                if (!_loading && (_committee + _general + _ambassador) > 0)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: GlassCard(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('WHO IS APPLYING',
                                style: monoStyle(context,
                                    size: 10, color: p.tech)),
                            const SizedBox(height: 10),
                            Center(
                                child: DonutChart(slices: [
                              ChartSlice(
                                  'Committee', _committee, kChartColors[0]),
                              ChartSlice(
                                  'Ambassador', _ambassador, kChartColors[1]),
                              ChartSlice('General', _general, kChartColors[2]),
                            ])),
                          ]),
                    ),
                  ),
                group('People and overview'),
                nav(
                        'Visitors',
                        'Who opened the website, by day and week, with IPs',
                        Icons.insights_rounded,
                        '/admin/visitors',
                        c: p.tech,
                        edit: false)
                    .stagger(3),
                nav('Applications', 'Review, approve, select for team',
                        Icons.assignment_ind_rounded, '/admin/applications',
                        c: p.third)
                    .stagger(3),
                nav('Team members', 'Add and edit committee members',
                        Icons.groups_rounded, '/admin/data/members')
                    .stagger(3),
                nav('Advisors', 'Teachers who guide the club',
                        Icons.school_rounded, '/admin/data/advisors')
                    .stagger(3),
                // committees and transfers are closed to editor logins by the server
                if (!state.isEditor)
                  nav('Committees', 'Launch a new semester committee',
                          Icons.rocket_launch_rounded, '/admin/committees')
                      .stagger(3),
                if (!state.isEditor)
                  nav(
                          'Transfer people',
                          'Copy or move people to another committee',
                          Icons.swap_horiz_rounded,
                          '/admin/transfer')
                      .stagger(3),
                // the activity log and login management are main-admin only
                if (state.isSuperAdmin)
                  nav('Team logins', 'Add editor logins',
                          Icons.manage_accounts_rounded, '/admin/team',
                          c: p.muted)
                      .stagger(3),
                if (state.isSuperAdmin)
                  nav('Activity log', 'Who changed what', Icons.history_rounded,
                          '/admin/activity',
                          c: p.muted, edit: false)
                      .stagger(3),
                group('Events and programmes'),
                nav(
                        'New event (Event Studio)',
                        'Details, sign-up, seats and publishing on one page',
                        Icons.auto_awesome_rounded,
                        '/admin/event-studio',
                        c: p.accent)
                    .stagger(3),
                nav('Events', 'Add, edit and schedule events',
                        Icons.event_rounded, '/admin/data/events')
                    .stagger(3),
                nav(
                        'Event sign-ups',
                        'Who registered, verify payments, waiting list',
                        Icons.groups_2_rounded,
                        '/admin/signups',
                        c: p.accent)
                    .stagger(3),
                nav('Event insights', 'Who signed up, who came, the money',
                        Icons.insights_rounded, '/admin/insights',
                        c: p.third, edit: false)
                    .stagger(3),
                nav(
                        'Check-in desk',
                        'Scan or type a ticket code at the entrance',
                        Icons.qr_code_scanner_rounded,
                        '/admin/checkin',
                        c: p.tech)
                    .stagger(3),
                nav('Contests', 'Hackathons, teams and results',
                        Icons.sports_esports_rounded, '/admin/data/contests',
                        c: p.tech)
                    .stagger(3),
                nav(
                        'Points and badges',
                        'Give extra points, see the leaderboard',
                        Icons.emoji_events_rounded,
                        '/admin/points',
                        c: p.accent)
                    .stagger(3),
                nav(
                        'Weekly sessions',
                        'Programming, web and AI sessions shown on Events',
                        Icons.schedule_rounded,
                        '/admin/data/weekly_sessions',
                        c: p.third)
                    .stagger(3),
                nav(
                        'Jobs and internships',
                        'Post openings, schedule or save as draft',
                        Icons.work_rounded,
                        '/admin/data/jobs',
                        c: p.third)
                    .stagger(3),
                group('Content'),
                nav('Notices', 'Post announcements', Icons.campaign_rounded,
                        '/admin/data/notices')
                    .stagger(3),
                nav('Posts', 'Short articles and updates',
                        Icons.article_rounded, '/admin/data/posts')
                    .stagger(3),
                nav('Gallery', 'Manage photos', Icons.photo_library_rounded,
                        '/admin/data/gallery')
                    .stagger(3),
                nav('Achievements', 'Milestones and awards',
                        Icons.emoji_events_rounded, '/admin/data/achievements')
                    .stagger(3),
                nav('Projects', 'Showcase projects', Icons.code_rounded,
                        '/admin/data/projects')
                    .stagger(3),
                nav('Resources', 'Slides, notes and tutorials',
                        Icons.local_library_rounded, '/admin/data/resources')
                    .stagger(3),
                nav('FAQs', 'Questions and answers', Icons.help_outline_rounded,
                        '/admin/data/faqs')
                    .stagger(3),
                nav('Sponsors', 'Supporters and logos', Icons.handshake_rounded,
                        '/admin/data/sponsors')
                    .stagger(3),
                nav(
                        'Testimonials',
                        'What alumni and members say, shown on the home page',
                        Icons.format_quote_rounded,
                        '/admin/data/testimonials',
                        c: p.third)
                    .stagger(3),
                nav(
                        'Site texts and links',
                        'Hero, about, mission, contact and social links',
                        Icons.edit_note_rounded,
                        '/admin/site',
                        c: p.tech)
                    .stagger(3),
                group('Forms, messages and mail'),
                nav('Forms', 'Build forms, see responses',
                        Icons.dynamic_form_rounded, '/admin/forms',
                        c: p.accent)
                    .stagger(3),
                nav('Inbox', 'Read and reply to contact messages',
                        Icons.mail_rounded, '/admin/inbox',
                        c: p.tech)
                    .stagger(3),
                if (!state.isEditor)
                  nav('Newsletter', 'Email all subscribers',
                          Icons.campaign_outlined, '/admin/newsletter',
                          c: p.third)
                      .stagger(3),
                nav(
                        'Subscribers',
                        'Newsletter emails',
                        Icons.mark_email_unread_rounded,
                        '/admin/data/subscribers',
                        c: p.tech,
                        edit: false)
                    .stagger(3),
                nav('Short links', 'Short links for events and forms',
                        Icons.link_rounded, '/admin/links')
                    .stagger(3),
                if (!state.isEditor)
                  nav('Downloads', 'Every list as CSV, Excel or JSON',
                          Icons.download_rounded, '/admin/downloads',
                          c: p.tech, edit: false)
                      .stagger(3),
                group('System'),
                if (!state.isEditor)
                  nav('Trash', 'Restore or permanently delete',
                          Icons.delete_outline_rounded, '/admin/trash',
                          c: const Color(0xFFEF4444))
                      .stagger(3),
                nav(
                        'Sign-in security',
                        'Your password, two-step sign-in, other devices',
                        Icons.shield_rounded,
                        '/admin/security',
                        c: p.accent)
                    .stagger(3),
                nav(
                        'Settings',
                        state.isEditor
                            ? 'Connection status and app info'
                            : 'Connection status and demo data',
                        Icons.settings_rounded,
                        '/admin/settings',
                        c: p.muted)
                    .stagger(3),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
