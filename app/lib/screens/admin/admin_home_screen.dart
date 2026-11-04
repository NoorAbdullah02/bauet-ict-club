import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/coder.dart';
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
        _pending = regs.where((r) => (r['status'] ?? 'pending') == 'pending').length;
        _committee = regs.where((r) => r['type'] == 'committee').length;
        _general = regs.where((r) => r['type'] == 'general').length;
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
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(icon, color: c, size: 22),
              const SizedBox(height: 10),
              _loading ? const ShimmerBox(width: 40, height: 28, radius: 8) : CountUp(value: v, style: displayStyle(context, 30)),
              const SizedBox(height: 2),
              Text(label.toUpperCase(), style: monoStyle(context, size: 9.5)),
            ]),
          ),
        );

    Widget nav(String title, String sub, IconData icon, String path, [Color? c]) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GlassCard(
            onTap: () => context.push(path),
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), color: (c ?? p.accent).withValues(alpha: 0.15)),
                child: Icon(icon, color: c ?? p.accent),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: bodyStyle(context, weight: FontWeight.w700, size: 15.5)),
                  Text(sub, style: bodyStyle(context, size: 12.5, color: p.muted)),
                ]),
              ),
              Icon(Icons.chevron_right_rounded, color: p.muted),
            ]),
          ),
        );

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
                    style: IconButton.styleFrom(backgroundColor: p.surface.withValues(alpha: 0.8), foregroundColor: p.fg),
                    onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
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
                  Text('Admin', style: displayStyle(context, 32)),
                ]).stagger(0),
                const SizedBox(height: 22),
                Row(children: [
                  stat('Pending', _pending, Icons.hourglass_top_rounded, const Color(0xFFFFC857)),
                  const SizedBox(width: 12),
                  stat('Messages', _messages, Icons.mail_rounded, p.tech),
                ]).stagger(1),
                const SizedBox(height: 12),
                Row(children: [
                  stat('Committee apps', _committee, Icons.workspace_premium_rounded, p.accent),
                  const SizedBox(width: 12),
                  stat('General apps', _general, Icons.bolt_rounded, p.third),
                ]).stagger(2),
                const SizedBox(height: 26),
                Text('MANAGE', style: monoStyle(context)),
                const SizedBox(height: 12),
                nav('Applications', 'Review, approve, select for team', Icons.assignment_ind_rounded, '/admin/applications', p.third).stagger(3),
                nav('Events', 'Create and edit events', Icons.event_rounded, '/admin/data/events').stagger(4),
                nav('Notices', 'Post announcements', Icons.campaign_rounded, '/admin/data/notices').stagger(5),
                nav('Team members', 'Edit committee members', Icons.groups_rounded, '/admin/data/members').stagger(6),
                nav('Gallery', 'Manage photos', Icons.photo_library_rounded, '/admin/data/gallery').stagger(7),
                nav('Achievements', 'Milestones and awards', Icons.emoji_events_rounded, '/admin/data/achievements').stagger(8),
                nav('Messages', 'Contact form inbox', Icons.mail_rounded, '/admin/data/messages', p.tech).stagger(9),
                nav('Projects', 'Showcase projects', Icons.code_rounded, '/admin/data/projects').stagger(9),
                nav('FAQs', 'Questions and answers', Icons.help_outline_rounded, '/admin/data/faqs').stagger(9),
                nav('Sponsors', 'Supporters and logos', Icons.handshake_rounded, '/admin/data/sponsors').stagger(9),
                nav('Subscribers', 'Newsletter emails', Icons.mark_email_unread_rounded, '/admin/data/subscribers', p.tech).stagger(9),
                nav('Committees', 'Launch a new semester committee', Icons.rocket_launch_rounded, '/admin/committees').stagger(10),
                nav('Trash', 'Restore or permanently delete', Icons.delete_outline_rounded, '/admin/trash', const Color(0xFFEF4444)).stagger(11),
                nav('Settings', 'Demo data', Icons.settings_rounded, '/admin/settings', p.muted).stagger(12),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
