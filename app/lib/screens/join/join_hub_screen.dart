import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../widgets/coder.dart';
import '../../widgets/common.dart';

class JoinHubScreen extends StatelessWidget {
  const JoinHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return ListView(
      padding: kPagePadding,
      children: [
        const SectionHeader(eyebrow: 'Membership', title: 'Join the club', subtitle: 'Pick the path that fits you. You can apply in under two minutes.').stagger(0),
        const SizedBox(height: 14),
        const PromptLine('join --list  # pick a path').stagger(1),
        const SizedBox(height: 18),
        _PathCard(
          tag: 'Committee',
          title: 'Executive committee',
          body: 'Lead projects, run events and shape the club. Choose a post and apply with your photo.',
          icon: Icons.workspace_premium_rounded,
          colors: [p.gradient.first, p.dark ? p.tech : p.gradient.last],
          bullets: const ['2-step application', 'Photo required', 'Pick your post'],
          onTap: () => context.push('/join/committee'),
        ).stagger(1),
        const SizedBox(height: 18),
        _PathCard(
          tag: 'General',
          title: 'General member',
          body: 'Learn, build and hang out with fellow geeks. Choose your interests and get invited to workshops.',
          icon: Icons.bolt_rounded,
          colors: [p.pink, p.dark ? p.accent : p.accent],
          bullets: const ['One quick form', 'Photo optional', 'Pick interests'],
          onTap: () => context.push('/join/general'),
        ).stagger(2),
        const SizedBox(height: 24),
        GlassCard(
          child: Row(children: [
            Icon(Icons.info_outline_rounded, color: p.tech),
            const SizedBox(width: 12),
            Expanded(child: Text('Applications are reviewed by the current committee. You will be contacted by email or phone.', style: bodyStyle(context, color: p.muted, size: 13))),
          ]),
        ).stagger(3),
      ],
    );
  }
}

class _PathCard extends StatelessWidget {
  const _PathCard({required this.tag, required this.title, required this.body, required this.icon, required this.colors, required this.bullets, required this.onTap});
  final String tag;
  final String title;
  final String body;
  final IconData icon;
  final List<Color> colors;
  final List<String> bullets;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: colors),
          boxShadow: [BoxShadow(color: colors.first.withValues(alpha: 0.35), blurRadius: 28, offset: const Offset(0, 14))],
        ),
        child: Stack(children: [
          Positioned(
            right: -10,
            top: -10,
            child: Icon(icon, size: 110, color: Colors.white.withValues(alpha: 0.14))
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .rotate(begin: -0.03, end: 0.03, duration: 3.seconds, curve: Curves.easeInOut),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(99)),
              child: Text(tag.toUpperCase(), style: monoStyle(context, color: Colors.white, size: 10, weight: FontWeight.w700)),
            ),
            const SizedBox(height: 14),
            Text(title, style: displayStyle(context, 27, color: Colors.white)),
            const SizedBox(height: 8),
            Text(body, style: bodyStyle(context, color: Colors.white.withValues(alpha: 0.9), size: 14)),
            const SizedBox(height: 14),
            Wrap(spacing: 14, runSpacing: 6, children: [
              for (final b in bullets)
                Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.check_circle_rounded, size: 15, color: Colors.white),
                  const SizedBox(width: 5),
                  Text(b, style: bodyStyle(context, size: 12.5, color: Colors.white, weight: FontWeight.w600)),
                ]),
            ]),
            const SizedBox(height: 18),
            Row(children: [
              Text('Start', style: bodyStyle(context, color: Colors.white, weight: FontWeight.w800, size: 15)),
              const SizedBox(width: 6),
              const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
            ]),
          ]),
        ]),
      ),
    );
  }
}
