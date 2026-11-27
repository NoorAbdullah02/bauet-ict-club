import '../core/i18n.dart';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/my_tickets.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/coder.dart';
import '../widgets/common.dart';
import '../widgets/countdown.dart';
import '../widgets/newsletter.dart';
import 'events_screen.dart';

/// "Voices of Impact": quotes from alumni and members (hydrated via bootstrap, zero extra API calls).
class _TestimonialsStrip extends StatelessWidget {
  const _TestimonialsStrip();

  @override
  Widget build(BuildContext context) {
    final items = context.select<AppState, List<Map<String, dynamic>>>((s) => s.testimonials);
    if (items.isEmpty) return const SizedBox.shrink();
    final p = context.pal;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Padding(
        padding: EdgeInsets.symmetric(horizontal: 20),
        child: SectionHeader(eyebrow: 'Voices of Impact', title: 'What our alumni and members say'),
      ),
      const SizedBox(height: 12),
      SizedBox(
        height: 200,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(width: 12),
          itemBuilder: (_, i) {
            final t = items[i];
            final name = '${t['name'] ?? 'Member'}'.trim();
            final photo = '${t['image_url'] ?? ''}'.trim();
            final rating = (t['rating'] is num ? (t['rating'] as num).toInt() : 5).clamp(1, 5);
            return SizedBox(
              width: 300,
              child: GlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: List.generate(rating, (_) => const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF5A524)))),
                  const SizedBox(height: 8),
                  Expanded(child: Text('\u201c${t['quote'] ?? ''}\u201d', maxLines: 4, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 13))),
                  const SizedBox(height: 10),
                  Row(children: [
                    SizedBox(
                      width: 32,
                      height: 32,
                      child: ClipOval(
                        child: photo.isEmpty
                            ? ColoredBox(
                                color: p.alt,
                                child: Center(child: Text(name.isEmpty ? '?' : name[0], style: displayStyle(context, 14, color: p.accent))),
                              )
                            : NetImage(AppConfig.portrait(photo, 120), width: 32, height: 32, fallbackLabel: name),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700, size: 13)),
                        if ('${t['role'] ?? ''}'.isNotEmpty)
                          Text('${t['role']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 11, color: p.tech)),
                        if ('${t['batch'] ?? ''}'.isNotEmpty)
                          Text('${t['batch']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: monoStyle(context, size: 9.5, color: p.muted)),
                      ]),
                    ),
                  ]),
                ]),
              ),
            );
          },
        ),
      ),
    ]);
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  final ScrollController _scroll = ScrollController();
  late final AnimationController _orbit = AnimationController(vsync: this, duration: 12.seconds)..repeat();
  SavedTicket? _ticket; // the saved ticket of the next event

  @override
  void initState() {
    super.initState();
    nextTicket().then((t) {
      if (mounted) setState(() => _ticket = t);
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    _orbit.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final p = context.pal;
    final upcoming = state.upcomingEvents.take(5).toList();
    final notices = state.activeNotices.take(3).toList();
    final blurb = state.settings.mission.isNotEmpty ? state.settings.mission : state.settings.aboutText;

    return RefreshIndicator(
      color: p.tech,
      backgroundColor: p.surface,
      onRefresh: state.loadAll,
      child: ListView(
        controller: _scroll,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 130),
        children: [
          _Hero(scroll: _scroll, orbit: _orbit, blurb: blurb),
          if (_ticket != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
              child: GlassCard(
                onTap: () => context.push('/ticket/${_ticket!.code}'),
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), gradient: p.brand),
                    child: const Icon(Icons.qr_code_2_rounded, color: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(tr('Your ticket').toUpperCase(), style: monoStyle(context, size: 9.5, color: p.tech)),
                      Text(_ticket!.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700, size: 15)),
                      Text(_ticket!.date, style: bodyStyle(context, size: 12.5, color: p.muted)),
                    ]),
                  ),
                  Icon(Icons.chevron_right_rounded, color: p.muted),
                ]),
              ),
            ),
          const Padding(padding: EdgeInsets.symmetric(horizontal: 20), child: TerminalCard()),
          if (upcoming.isNotEmpty) ...[
            const SizedBox(height: 18),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: CountdownCard(event: upcoming.first, onTap: () => context.push('/events/${upcoming.first.id}')).stagger(0),
            ),
          ],
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _Stats(state: state).stagger(0),
          ),
          const SizedBox(height: 24),
          _MediaReelStrip(items: state.gallery).stagger(0),
          const SizedBox(height: 20),
          const _VideoHighlightsCard().stagger(0),
          if (state.featuredCommittee.isNotEmpty) ...[
            const SizedBox(height: 30),
            _AvatarStrip(
              eyebrow: 'The team',
              title: isBangla ? '${state.latestSession} কমিটির সাথে পরিচিত হোন' : 'Meet the ${state.latestSession} committee',
              members: state.featuredCommittee,
              showRole: true,
              onSeeAll: () => context.go('/team'),
            ).stagger(0),
          ],
          if (state.ambassadors.isNotEmpty) ...[
            const SizedBox(height: 30),
            _AvatarStrip(
              eyebrow: 'Campus voices',
              title: 'Department ambassadors',
              members: state.ambassadors.take(12).toList(),
              showRole: false,
              onSeeAll: () => context.go('/ambassadors'),
            ).stagger(0),
          ],
          const SizedBox(height: 34),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SectionHeader(
              eyebrow: 'Coming up',
              title: 'Next events',
              trailing: TextButton(onPressed: () => context.go('/events'), child: Text(tr('See all'))),
            ),
          ),
          const SizedBox(height: 14),
          if (state.loading && !state.loadedOnce)
            const Padding(padding: EdgeInsets.symmetric(horizontal: 20), child: ShimmerBox(height: 210, radius: 28))
          else if (upcoming.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: EmptyState(icon: Icons.event_busy_rounded, title: 'No upcoming events', message: 'New events will show up here.'),
            )
          else
            SizedBox(
              height: 262,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: upcoming.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (_, i) => SizedBox(width: 280, child: EventCard(event: upcoming[i], compact: true).stagger(i)),
              ),
            ),
          const SizedBox(height: 34),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SectionHeader(
              eyebrow: 'Pinned',
              title: 'Notice board',
              trailing: TextButton(onPressed: () => context.go('/notices'), child: Text(tr('See all'))),
            ),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: notices.isEmpty
                ? const EmptyState(icon: Icons.campaign_outlined, title: 'No notices right now')
                : Column(children: [for (var i = 0; i < notices.length; i++) _NoticeTile(notice: notices[i]).stagger(i)]),
          ),
          // Partnerships & Collaborations
          const SizedBox(height: 30),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const SectionHeader(
                  eyebrow: 'Collaborations',
                  title: 'Partners & Sponsors',
                ),
                TextButton(
                  onPressed: () => context.go('/contact'),
                  child: Text(tr('Partner with us')),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (state.sponsors.isNotEmpty)
            SizedBox(
              height: 74,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: state.sponsors.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (_, i) {
                  final s = state.sponsors[i];
                  return GestureDetector(
                    onTap: s.website.isEmpty ? null : () => openUrl(context, normalizeLink(s.website)),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: p.line),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (s.logoUrl.isNotEmpty)
                            SizedBox(height: 32, child: NetImage(s.logoUrl, fit: BoxFit.contain, fallbackLabel: s.name))
                          else
                            Text(s.name, style: bodyStyle(context, color: const Color(0xFF0A1A3F), weight: FontWeight.w700, size: 13)),
                          if (s.tier.isNotEmpty) ...[
                            const SizedBox(height: 3),
                            Text(
                              s.tier,
                              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.blueGrey),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: GlassCard(
                onTap: () => context.go('/contact'),
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.handshake_outlined, color: p.tech, size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Interested in Partnering?',
                            style: displayStyle(context, 14, weight: FontWeight.w700),
                          ),
                          Text(
                            'Collaborate on workshops, hackathons & tech events.',
                            style: bodyStyle(context, size: 12, color: p.muted),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward_rounded, size: 18, color: p.accent),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 28),
          const _TestimonialsStrip(),
          const SizedBox(height: 28),
          const Padding(padding: EdgeInsets.symmetric(horizontal: 20), child: NewsletterBox()),
          const SizedBox(height: 14),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 20), child: const _JoinCta().stagger(0)),
          if (state.offline)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: GlassCard(
                onTap: state.loadAll,
                child: Row(children: [
                  Icon(Icons.cloud_off_rounded, color: p.third),
                  const SizedBox(width: 12),
                  Expanded(child: Text('// offline: showing cached data. Tap to refresh.', style: monoStyle(context, color: p.fg, size: 11.5))),
                ]),
              ),
            ),
          if (state.error != null && state.loadedOnce && !state.offline)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: GlassCard(
                onTap: state.loadAll,
                child: Row(children: [
                  Icon(Icons.cloud_off_rounded, color: p.third),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Some content failed to load. Tap to retry.', style: bodyStyle(context, size: 13))),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.scroll, required this.orbit, required this.blurb});
  final ScrollController scroll;
  final AnimationController orbit;
  final String blurb;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    // the rings are painted by one painter that listens to the controller (no widget rebuilds per frame);
    // scrolling only moves the finished layer
    final rings = RepaintBoundary(child: SizedBox(width: 260, height: 260, child: CustomPaint(painter: _RingsPainter(orbit, p))));
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 470),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Parallax orb: drifts slower than the page.
          Positioned.fill(
            child: AnimatedBuilder(
              animation: scroll,
              child: rings,
              builder: (context, child) {
                final off = scroll.hasClients ? scroll.offset.clamp(0.0, 600.0).toDouble() : 0.0;
                return Stack(clipBehavior: Clip.none, children: [
                  Positioned(right: -50, top: 30 + off * 0.35, child: Opacity(opacity: (1 - off / 450).clamp(0.0, 1.0).toDouble(), child: child)),
                ]);
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 36, 20, 26),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(99), border: Border.all(color: p.line), color: p.surface.withValues(alpha: 0.5)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    RepaintBoundary(
                      child: Container(width: 7, height: 7, decoration: BoxDecoration(shape: BoxShape.circle, color: p.tech))
                          .animate(onPlay: (c) => c.repeat(reverse: true))
                          .fade(begin: 0.3, end: 1, duration: 900.ms),
                    ),
                    const SizedBox(width: 8),
                    Text('// bauet.ict.club', style: monoStyle(context, size: 10.5, color: p.fg)),
                  ]),
                ).animate().fadeIn(duration: 500.ms),
                const SizedBox(height: 20),
                const Row(children: [LogoImage.crest(height: 46), SizedBox(width: 14), LogoImage.club(height: 40)]),
                const SizedBox(height: 40),
                Text(tr('Where code'), style: displayStyle(context, 46)).animate().fadeIn(delay: 150.ms, duration: 600.ms).slideY(begin: 0.25, end: 0),
                GradientText(tr('meets community.'), style: displayStyle(context, 46))
                    .animate()
                    .fadeIn(delay: 300.ms, duration: 600.ms)
                    .slideY(begin: 0.25, end: 0),
                const SizedBox(height: 16),
                Text(
                  blurb.isEmpty ? 'Workshops, contests, projects and a community of builders at BAUET.' : blurb,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: bodyStyle(context, color: p.muted, size: 15),
                ).animate().fadeIn(delay: 500.ms, duration: 600.ms),
                const SizedBox(height: 24),
                Row(children: [
                  Expanded(flex: 5, child: JoinPill(onTap: () => context.go('/join'))),
                  const SizedBox(width: 12),
                  Expanded(flex: 4, child: GhostButton(label: 'Events', onPressed: () => context.go('/events'))),
                ]).animate().fadeIn(delay: 700.ms, duration: 600.ms).slideY(begin: 0.2, end: 0),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Four tilted rings around a glowing core. A ring seen from the side is an ellipse, so the "3D" turn is drawn
/// with squashed ellipses: cheap enough for any phone.
class _RingsPainter extends CustomPainter {
  _RingsPainter(this.orbit, this.p) : super(repaint: orbit);
  final AnimationController orbit;
  final Pal p;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final t = orbit.value * 2 * math.pi;
    canvas.drawCircle(
      c,
      60,
      Paint()..shader = RadialGradient(colors: [p.tech.withValues(alpha: 0.9), p.accent.withValues(alpha: 0.6), p.accent.withValues(alpha: 0)]).createShader(Rect.fromCircle(center: c, radius: 60)),
    );
    final colors = [p.accent, p.tech, p.third, p.accent];
    for (var i = 0; i < 4; i++) {
      final r = (240 - i * 28.0) / 2;
      final squashX = math.cos(t * (i.isEven ? 1 : -1) * 0.7 + i * 0.5).abs().clamp(0.12, 1.0);
      final squashY = math.cos(t + i * 0.8).abs().clamp(0.12, 1.0);
      canvas.save();
      canvas.translate(c.dx, c.dy);
      canvas.rotate(i * 0.6 + t * 0.15);
      canvas.drawOval(
        Rect.fromCenter(center: Offset.zero, width: r * 2 * squashX.toDouble(), height: r * 2 * squashY.toDouble()),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.6
          ..color = colors[i].withValues(alpha: 0.75),
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_RingsPainter old) => old.p != p;
}

class _Stats extends StatelessWidget {
  const _Stats({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final items = <(String, int, IconData)>[
      ('Members', state.members.length, Icons.groups_rounded),
      ('Events', state.events.length, Icons.event_rounded),
      ('Awards', state.achievements.length, Icons.emoji_events_rounded),
      ('Photos', state.gallery.length, Icons.photo_rounded),
    ];
    final p = context.pal;
    return GlassCard(
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
      child: Row(children: [
        for (final s in items)
          Expanded(
            child: Column(children: [
              Icon(s.$3, size: 18, color: p.tech),
              const SizedBox(height: 6),
              CountUp(value: s.$2, style: displayStyle(context, 26)),
              const SizedBox(height: 2),
              Text(tr(s.$1).toUpperCase(), style: monoStyle(context, size: 9)),
            ]),
          ),
      ]),
    );
  }
}

class _NoticeTile extends StatelessWidget {
  const _NoticeTile({required this.notice});
  final NoticeItem notice;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        onTap: () => context.go('/notices'),
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), color: noticeColor(p, notice.priority).withValues(alpha: 0.15)),
            child: Icon(notice.pinned ? Icons.push_pin_rounded : Icons.campaign_rounded, size: 20, color: noticeColor(p, notice.priority)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(notice.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700)),
              const SizedBox(height: 3),
              Text(fmtDate(notice.date), style: monoStyle(context, size: 10)),
            ]),
          ),
          Icon(Icons.chevron_right_rounded, color: p.muted),
        ]),
      ),
    );
  }
}

Color noticeColor(Pal p, String priority) {
  switch (priority.toLowerCase()) {
    case 'high':
    case 'urgent':
      return const Color(0xFFFF5C7A);
    case 'low':
      return p.muted;
    default:
      return p.tech;
  }
}

class _JoinCta extends StatelessWidget {
  const _JoinCta();

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [...p.gradient, p.third.withValues(alpha: 0.9)]),
        boxShadow: [BoxShadow(color: p.gradient.first.withValues(alpha: 0.4), blurRadius: 30, offset: const Offset(0, 14))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('\$ git checkout -b you', style: monoStyle(context, color: Colors.white70, size: 11.5)),
        const SizedBox(height: 8),
        Text(tr('Be part of what we build next.'), style: displayStyle(context, 24, color: Colors.white)),
        const SizedBox(height: 8),
        Text(tr('Apply for the executive committee or become a general member.'), style: bodyStyle(context, color: Colors.white.withValues(alpha: 0.85))),
        const SizedBox(height: 18),
        FilledButton.icon(
          onPressed: () => context.go('/join'),
          style: FilledButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: p.dark ? const Color(0xFF07122B) : p.accent,
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          icon: const Icon(Icons.arrow_forward_rounded),
          label: Text(tr('Start application')),
        ),
      ]),
    );
  }
}

/// Horizontal strip of circular photos with name + role/department.
class _AvatarStrip extends StatelessWidget {
  const _AvatarStrip({required this.eyebrow, required this.title, required this.members, required this.showRole, required this.onSeeAll});
  final String eyebrow;
  final String title;
  final List<Member> members;
  final bool showRole;
  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: SectionHeader(eyebrow: eyebrow, title: title, trailing: TextButton(onPressed: onSeeAll, child: Text(tr('See all')))),
      ),
      const SizedBox(height: 14),
      SizedBox(
        height: 132,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          itemCount: members.length,
          separatorBuilder: (_, __) => const SizedBox(width: 14),
          itemBuilder: (_, i) {
            final m = members[i];
            return GestureDetector(
              onTap: onSeeAll,
              child: SizedBox(
                width: 84,
                child: Column(children: [
                  Container(
                    width: 74,
                    height: 74,
                    padding: const EdgeInsets.all(2.5),
                    decoration: BoxDecoration(shape: BoxShape.circle, gradient: p.brand),
                    child: ClipOval(child: NetImage(AppConfig.portrait(m.imageUrl, 240), width: 70, height: 70, fallbackLabel: m.name)),
                  ),
                  const SizedBox(height: 8),
                  Text(m.name.split(' ').first, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12.5, weight: FontWeight.w700)),
                  Text(
                    showRole ? m.position.replaceAll(RegExp(r'\s*\(.*\)'), '') : m.department,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: bodyStyle(context, size: 10.5, color: p.muted),
                  ),
                ]),
              ),
            );
          },
        ),
      ),
    ]);
  }
}

/// Horizontal photo reel showing club moments in motion.
class _MediaReelStrip extends StatelessWidget {
  const _MediaReelStrip({required this.items});
  final List<GalleryItem> items;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    // Curated fallback moments when database has no gallery items yet
    final displayItems = items.isNotEmpty
        ? items
        : [
            GalleryItem.fromJson({
              'id': 101,
              'title': 'National Hackathon Championship',
              'category': 'Contest',
              'image_url': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
            }),
            GalleryItem.fromJson({
              'id': 102,
              'title': 'Robotics & Hardware Lab',
              'category': 'Robotics',
              'image_url': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
            }),
            GalleryItem.fromJson({
              'id': 103,
              'title': 'AI & Machine Learning Workshop',
              'category': 'Workshop',
              'image_url': 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
            }),
          ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: SectionHeader(
            eyebrow: 'In motion',
            title: 'Campus Life & Moments',
            trailing: TextButton(
              onPressed: () => context.go('/gallery'),
              child: Text(tr('See all')),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 175,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: displayItems.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, i) {
              final g = displayItems[i];
              return GestureDetector(
                onTap: () => context.go('/gallery'),
                child: Container(
                  width: 240,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: p.line),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      NetImage(g.imageUrl, width: 240, height: 175, fallbackLabel: g.title),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.85),
                            ],
                          ),
                        ),
                      ),
                      if (g.category.isNotEmpty)
                        Positioned(
                          top: 10,
                          left: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              g.category,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      Positioned(
                        bottom: 12,
                        left: 12,
                        right: 12,
                        child: Text(
                          g.title.isNotEmpty ? g.title : 'Club moment',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Highlight card showing video content and campus journey.
class _VideoHighlightsCard extends StatelessWidget {
  const _VideoHighlightsCard();

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GlassCard(
        onTap: () => openUrl(context, 'https://www.youtube.com'),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: p.brand,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 32),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CLUB IN MOTION',
                    style: TextStyle(
                      color: p.tech,
                      fontSize: 10.5,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Watch our hackathon recap & tech talks',
                    style: displayStyle(context, 14, weight: FontWeight.w700),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios_rounded, size: 14, color: p.muted),
          ],
        ),
      ),
    );
  }
}
