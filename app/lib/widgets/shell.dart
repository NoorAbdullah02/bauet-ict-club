import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
import '../core/i18n.dart';
import '../core/push.dart';
import '../core/theme.dart';
import '../state/app_state.dart';
import 'coder.dart';
import 'common.dart';

class _NavItem {
  const _NavItem(this.path, this.label, this.icon, this.activeIcon);
  final String path;
  final String label;
  final IconData icon;
  final IconData activeIcon;
}

const _tabs = [
  _NavItem('/home', 'Home', Icons.home_outlined, Icons.home_rounded),
  _NavItem('/events', 'Events', Icons.event_outlined, Icons.event_rounded),
  _NavItem('/team', 'Team', Icons.groups_outlined, Icons.groups_rounded),
  _NavItem('/join', 'Join', Icons.rocket_launch_outlined,
      Icons.rocket_launch_rounded),
];

const _more = [
  _NavItem(
      '/my-card', 'My member card', Icons.badge_outlined, Icons.badge_rounded),
  _NavItem(
      '/notices', 'Notices', Icons.campaign_outlined, Icons.campaign_rounded),
  _NavItem('/ambassadors', 'Ambassadors', Icons.school_outlined,
      Icons.school_rounded),
  _NavItem('/gallery', 'Gallery', Icons.photo_library_outlined,
      Icons.photo_library_rounded),
  _NavItem('/achievements', 'Achievements', Icons.emoji_events_outlined,
      Icons.emoji_events_rounded),
  _NavItem('/projects', 'Projects', Icons.code_outlined, Icons.code_rounded),
  _NavItem('/resources', 'Resources', Icons.local_library_outlined,
      Icons.local_library_rounded),
  _NavItem('/jobs/remote', 'Remote jobs', Icons.public_outlined,
      Icons.public_rounded),
  _NavItem('/jobs', 'Jobs', Icons.work_outline_rounded, Icons.work_rounded),
  _NavItem('/contests', 'Contests', Icons.sports_esports_outlined,
      Icons.sports_esports_rounded),
  _NavItem('/leaderboard', 'Leaderboard', Icons.leaderboard_outlined,
      Icons.leaderboard_rounded),
  _NavItem(
      '/data', 'Club data', Icons.bar_chart_outlined, Icons.bar_chart_rounded),
  _NavItem('/faq', 'FAQ', Icons.help_outline_rounded, Icons.help_rounded),
  _NavItem('/about', 'About', Icons.info_outline_rounded, Icons.info_rounded),
  _NavItem(
      '/contact', 'Contact', Icons.mail_outline_rounded, Icons.mail_rounded),
];

String _titleFor(String loc) {
  for (final t in [..._tabs, ..._more]) {
    if (loc.startsWith(t.path)) return t.label;
  }
  return AppConfig.clubName;
}

/// Main scaffold: aurora backdrop, app bar with theme toggle, drawer, bottom nav. The chat assistant is an app-bar icon (no floating button over the page).
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.location, required this.child});
  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final state = context.watch<AppState>();
    final tabIndex = _tabs.indexWhere((t) => location.startsWith(t.path));
    final isHome = location.startsWith('/home');
    // One centred column for the bar and the page on tablets; phones stay edge to edge.
    // The page content already sits 20dp inside that column, so the bar uses the same inset
    // and its logo/labels line up with the page text.
    const contentWidth = 960.0;
    const pageInset = 20.0;
    final screenWidth = MediaQuery.sizeOf(context).width;
    final wide = screenWidth > contentWidth;
    final gutter = wide ? (screenWidth - contentWidth) / 2 + pageInset : 20.0;

    return AuroraBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBody: true,
        appBar: AppBar(
          titleSpacing: gutter,
          title: isHome
              ? Row(children: [
                  const LogoImage.club(height: 34),
                ])
              : Text(tr(_titleFor(location)), style: displayStyle(context, 22)),
          actions: [
            IconButton(
                tooltip: tr('Search'),
                onPressed: () => context.push('/search'),
                icon: const Icon(Icons.search_rounded)),
            IconButton(
              tooltip: tr('Chat with us'),
              onPressed: () {
                HapticFeedback.lightImpact();
                context.push('/chat');
              },
              icon: ChatFace(size: 26, bubble: p.accent, face: p.bg),
            ),
            IconButton(
              tooltip: state.themeMode == ThemeMode.system
                  ? 'Theme: automatic (follows phone)'
                  : state.themeMode == ThemeMode.dark
                      ? 'Theme: dark'
                      : 'Theme: light',
              onPressed: () {
                HapticFeedback.selectionClick();
                state.toggleTheme();
              },
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                transitionBuilder: (c, a) => RotationTransition(
                    turns: Tween(begin: 0.75, end: 1.0).animate(a),
                    child: FadeTransition(opacity: a, child: c)),
                child: Icon(
                    state.themeMode == ThemeMode.system
                        ? Icons.brightness_auto_rounded
                        : state.themeMode == ThemeMode.dark
                            ? Icons.dark_mode_rounded
                            : Icons.light_mode_rounded,
                    key: ValueKey(state.themeMode)),
              ),
            ),
            Builder(
              builder: (ctx) => IconButton(
                tooltip: 'Menu',
                onPressed: () => Scaffold.of(ctx).openEndDrawer(),
                icon: const Icon(Icons.apps_rounded),
              ),
            ),
            SizedBox(width: wide ? gutter : 6),
          ],
        ),
        endDrawer: _AppDrawer(location: location, isAdmin: state.isAdmin),
        body: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: contentWidth),
            child: child,
          ),
        ),
        bottomNavigationBar: _GlossNav(
          selected: tabIndex,
          onTap: (i) {
            HapticFeedback.selectionClick();
            context.go(_tabs[i].path);
          },
        ),
      ),
    );
  }
}

/// True when [loc] is this item's page or one of its sub-pages (and not another menu item's page, e.g. /jobs vs /jobs/remote).
bool _isHere(String loc, _NavItem t) {
  if (loc == t.path) return true;
  if (!loc.startsWith('${t.path}/')) return false;
  return !_more.any((o) =>
      o.path != t.path && o.path.startsWith(t.path) && loc.startsWith(o.path));
}

/// The side menu: a gradient header, four big tiles for the main pages, grouped lists, and Language / Theme / Admin pinned at the bottom (always in view).
class _AppDrawer extends StatelessWidget {
  const _AppDrawer({required this.location, required this.isAdmin});
  final String location;
  final bool isAdmin;

  static const _groups = <(String, List<String>)>[
    ('Opportunities', ['/jobs', '/jobs/remote', '/contests', '/leaderboard']),
    (
      'The club',
      [
        '/my-card',
        '/notices',
        '/ambassadors',
        '/gallery',
        '/achievements',
        '/projects',
        '/resources'
      ]
    ),
    ('Help', ['/faq', '/data', '/about', '/contact']),
  ];

  _NavItem _item(String path) => _more.firstWhere((t) => t.path == path);

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final state = context.watch<AppState>();

    Widget mainTile(_NavItem t) {
      final on = _isHere(location, t);
      return Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () {
              Navigator.pop(context);
              context.go(t.path);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                gradient: on ? p.brand : null,
                color: on ? null : p.surface,
                border: Border.all(color: on ? Colors.transparent : p.line),
                boxShadow: on
                    ? [
                        BoxShadow(
                            color: p.gradient.first.withValues(alpha: 0.35),
                            blurRadius: 14,
                            offset: const Offset(0, 6))
                      ]
                    : null,
              ),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(on ? t.activeIcon : t.icon,
                    size: 22, color: on ? Colors.white : p.accent),
                const SizedBox(height: 4),
                Text(tr(t.label),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: on ? Colors.white : p.fg)),
              ]),
            ),
          ),
        ),
      );
    }

    Widget row(_NavItem t) {
      final on = _isHere(location, t);
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        child: Material(
          color: on ? p.accent.withValues(alpha: 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () {
              Navigator.pop(context);
              context.go(t.path);
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
              child: Row(children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(11),
                      color: on ? p.accent : p.alt),
                  child: Icon(on ? t.activeIcon : t.icon,
                      size: 19, color: on ? Colors.white : p.muted),
                ),
                const SizedBox(width: 12),
                Expanded(
                    child: Text(tr(t.label),
                        style: bodyStyle(context,
                            weight: on ? FontWeight.w800 : FontWeight.w600,
                            color: on ? p.accent : p.fg))),
                if (on) Icon(Icons.circle, size: 8, color: p.accent),
              ]),
            ),
          ),
        ),
      );
    }

    Widget heading(String text) => Padding(
          padding: const EdgeInsets.fromLTRB(22, 14, 22, 4),
          child: Text(tr(text).toUpperCase(),
              style: monoStyle(context,
                  size: 10, color: p.muted, weight: FontWeight.w700)),
        );

    Widget pinned(IconData icon, String label, VoidCallback onTap) => Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: onTap,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    color: p.surface,
                    border: Border.all(color: p.line)),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(icon, size: 20, color: p.accent),
                  const SizedBox(height: 3),
                  Text(label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: p.fg)),
                ]),
              ),
            ),
          ),
        );

    final themeIcon = state.themeMode == ThemeMode.system
        ? Icons.brightness_auto_rounded
        : state.themeMode == ThemeMode.dark
            ? Icons.dark_mode_rounded
            : Icons.light_mode_rounded;
    final themeLabel = state.themeMode == ThemeMode.system
        ? 'Auto'
        : state.themeMode == ThemeMode.dark
            ? 'Dark'
            : 'Light';

    return Drawer(
      backgroundColor: p.bg,
      width: 310,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.horizontal(left: Radius.circular(30))),
      child: SafeArea(
        child: Column(children: [
          // header
          Container(
            margin: const EdgeInsets.fromLTRB(12, 12, 12, 6),
            padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF1F4FD8), Color(0xFF0B7F9E)]),
              boxShadow: [
                BoxShadow(
                    color: const Color(0xFF1F4FD8).withValues(alpha: 0.3),
                    blurRadius: 18,
                    offset: const Offset(0, 8))
              ],
            ),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16)),
                child: const LogoImage.club(height: 36),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('// ${tr('explore')}',
                          style: monoStyle(context,
                              size: 10, color: Colors.white70)),
                      const SizedBox(height: 2),
                      Text(AppConfig.clubName,
                          maxLines: 2,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 17,
                              height: 1.15)),
                    ]),
              ),
              IconButton(
                  tooltip: tr('Close'),
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, color: Colors.white)),
            ]),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.only(bottom: 8),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
                  child: Row(children: [for (final t in _tabs) mainTile(t)]),
                ),
                for (final g in _groups) ...[
                  heading(g.$1),
                  for (final path in g.$2) row(_item(path)),
                ],
                heading('Ask'),
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      Navigator.pop(context);
                      context.push('/chat');
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 11),
                      child: Row(children: [
                        Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(11),
                                color: p.alt),
                            alignment: Alignment.center,
                            child: ChatFace(
                                size: 22, bubble: p.accent, face: p.bg)),
                        const SizedBox(width: 12),
                        Expanded(
                            child: Text(tr('Chat assistant'),
                                style: bodyStyle(context,
                                    weight: FontWeight.w600))),
                      ]),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // always in view
          Container(
            padding: const EdgeInsets.fromLTRB(8, 10, 8, 10),
            decoration:
                BoxDecoration(border: Border(top: BorderSide(color: p.line))),
            child: Row(children: [
              pinned(Icons.translate_rounded, isBangla ? 'English' : 'বাংলা',
                  () {
                Navigator.pop(context);
                final st = context.read<AppState>();
                st.setLang(isBangla ? 'en' : 'bn');
                Push.refresh(
                    st); // the server sends Bangla messages to Bangla apps
              }),
              pinned(themeIcon, tr(themeLabel),
                  () => context.read<AppState>().toggleTheme()),
              pinned(
                  state.pushOn
                      ? Icons.notifications_active_rounded
                      : Icons.notifications_off_rounded,
                  tr(state.pushOn ? 'Alerts on' : 'Alerts off'), () {
                Navigator.pop(context);
                showAlertsSheet(context);
              }),
              pinned(Icons.admin_panel_settings_rounded,
                  tr(isAdmin ? 'Admin' : 'Admin login'), () {
                Navigator.pop(context);
                context.push('/admin');
              }),
            ]),
          ),
        ]),
      ),
    );
  }
}

/// Floating, rounded, glossy tab bar: a glass-like capsule with a soft highlight on top and a gradient pill under the open tab.
class _GlossNav extends StatelessWidget {
  const _GlossNav({required this.selected, required this.onTap});
  final int selected;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final dark = p.dark;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Container(
              height: 70,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(32),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: dark
                      ? [const Color(0xFF1A2C5E), const Color(0xFF0E1D42)]
                      : [Colors.white, const Color(0xFFEAF1FF)],
                ),
                border: Border.all(
                    color: dark
                        ? Colors.white.withValues(alpha: 0.14)
                        : Colors.white,
                    width: 1.2),
                boxShadow: [
                  BoxShadow(
                      color: (dark ? Colors.black : const Color(0xFF1F4FD8))
                          .withValues(alpha: dark ? 0.5 : 0.22),
                      blurRadius: 28,
                      offset: const Offset(0, 12)),
                  if (dark)
                    BoxShadow(
                        color: p.accent.withValues(alpha: 0.16),
                        blurRadius: 22,
                        spreadRadius: -4),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(32),
                child: Stack(children: [
                  // gloss: a bright band along the top edge that fades out
                  Positioned(
                    left: 0,
                    right: 0,
                    top: 0,
                    height: 34,
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.white
                                    .withValues(alpha: dark ? 0.16 : 0.85),
                                Colors.white.withValues(alpha: 0)
                              ]),
                        ),
                      ),
                    ),
                  ),
                  Row(children: [
                    for (var i = 0; i < _tabs.length; i++)
                      Expanded(
                        child: Semantics(
                          button: true,
                          selected: i == selected,
                          label: _tabs[i].label,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(28),
                            onTap: () => onTap(i),
                            child: Center(
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 160),
                                curve: Curves.easeOutCubic,
                                padding: EdgeInsets.symmetric(
                                    horizontal: i == selected ? 16 : 8,
                                    vertical: 8),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(24),
                                  gradient: i == selected ? p.brand : null,
                                  boxShadow: i == selected
                                      ? [
                                          BoxShadow(
                                              color: p.gradient.first
                                                  .withValues(alpha: 0.45),
                                              blurRadius: 14,
                                              offset: const Offset(0, 5))
                                        ]
                                      : null,
                                ),
                                child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                          i == selected
                                              ? _tabs[i].activeIcon
                                              : _tabs[i].icon,
                                          size: 22,
                                          color: i == selected
                                              ? Colors.white
                                              : p.muted),
                                      const SizedBox(height: 2),
                                      Text(tr(_tabs[i].label),
                                          style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: i == selected
                                                  ? Colors.white
                                                  : p.muted)),
                                    ]),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ]),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The notification settings: one switch for all, and a switch for each topic (urgent notices always reach everyone).
void showAlertsSheet(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    useSafeArea: true,
    builder: (ctx) => Consumer<AppState>(
      builder: (ctx, state, _) {
        final p = ctx.pal;
        const labels = {
          'events': 'Events',
          'notices': 'Notices',
          'jobs': 'Jobs & internships',
          'contests': 'Contests',
          'projects': 'Projects',
        };
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tr('Notifications'), style: displayStyle(ctx, 22)),
                const SizedBox(height: 4),
                Text(tr('Choose what you want to hear about'),
                    style: bodyStyle(ctx, size: 13, color: p.muted)),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(tr('Allow notifications'),
                      style: bodyStyle(ctx, weight: FontWeight.w700)),
                  value: state.pushOn,
                  onChanged: (v) => Push.setEnabled(state, v),
                ),
                const Divider(height: 8),
                for (final t in AppState.pushTopicNames)
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(tr(labels[t] ?? t), style: bodyStyle(ctx)),
                    value: state.pushTopics.contains(t),
                    onChanged: state.pushOn
                        ? (v) {
                            state.setPushTopic(t, v);
                            Push.refresh(state);
                          }
                        : null,
                  ),
                const SizedBox(height: 4),
                Text(tr('Urgent notices always reach everyone.'),
                    style: bodyStyle(ctx, size: 12, color: p.muted)),
              ]),
        );
      },
    ),
  );
}
