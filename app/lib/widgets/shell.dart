import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/config.dart';
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
  _NavItem('/join', 'Join', Icons.rocket_launch_outlined, Icons.rocket_launch_rounded),
];

const _more = [
  _NavItem('/notices', 'Notices', Icons.campaign_outlined, Icons.campaign_rounded),
  _NavItem('/gallery', 'Gallery', Icons.photo_library_outlined, Icons.photo_library_rounded),
  _NavItem('/achievements', 'Achievements', Icons.emoji_events_outlined, Icons.emoji_events_rounded),
  _NavItem('/about', 'About', Icons.info_outline_rounded, Icons.info_rounded),
  _NavItem('/contact', 'Contact', Icons.mail_outline_rounded, Icons.mail_rounded),
];

String _titleFor(String loc) {
  for (final t in [..._tabs, ..._more]) {
    if (loc.startsWith(t.path)) return t.label;
  }
  return AppConfig.clubName;
}

/// Main scaffold: aurora backdrop, app bar with theme toggle, drawer, bottom nav, chat FAB.
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

    return AuroraBackground(
      child: Scaffold(
      backgroundColor: Colors.transparent,
      extendBody: true,
      appBar: AppBar(
        titleSpacing: 20,
        title: isHome
            ? Row(children: [
                const LogoImage.crest(height: 34),
                const SizedBox(width: 10),
                const LogoImage.club(height: 30),
              ])
            : Text(_titleFor(location), style: displayStyle(context, 22)),
        actions: [
          IconButton(
            tooltip: 'Toggle theme',
            onPressed: () {
              HapticFeedback.selectionClick();
              state.toggleTheme();
            },
            icon: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (c, a) => RotationTransition(turns: Tween(begin: 0.75, end: 1.0).animate(a), child: FadeTransition(opacity: a, child: c)),
              child: Icon(p.dark ? Icons.light_mode_rounded : Icons.dark_mode_rounded, key: ValueKey(p.dark)),
            ),
          ),
          Builder(
            builder: (ctx) => IconButton(
              tooltip: 'Menu',
              onPressed: () => Scaffold.of(ctx).openEndDrawer(),
              icon: const Icon(Icons.apps_rounded),
            ),
          ),
          const SizedBox(width: 6),
        ],
      ),
      endDrawer: _AppDrawer(location: location, isAdmin: state.isAdmin),
      body: child,
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'chat-fab',
        onPressed: () => context.push('/chat'),
        backgroundColor: p.accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.auto_awesome_rounded),
        label: const Text('Ask AI'),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tabIndex < 0 ? 0 : tabIndex,
        onDestinationSelected: (i) => context.go(_tabs[i].path),
        destinations: [
          for (final t in _tabs) NavigationDestination(icon: Icon(t.icon), selectedIcon: Icon(t.activeIcon), label: t.label),
        ],
      ),
      ),
    );
  }
}

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({required this.location, required this.isAdmin});
  final String location;
  final bool isAdmin;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    Widget tile(_NavItem t) {
      final sel = location.startsWith(t.path);
      return ListTile(
        leading: Icon(sel ? t.activeIcon : t.icon, color: sel ? p.accent : p.muted),
        title: Text(t.label, style: bodyStyle(context, weight: FontWeight.w600)),
        selected: sel,
        onTap: () {
          Navigator.pop(context);
          context.go(t.path);
        },
      );
    }

    return Drawer(
      backgroundColor: p.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.horizontal(left: Radius.circular(28))),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 12),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: const [LogoImage.crest(height: 44), SizedBox(width: 12), LogoImage.club(height: 38)]),
                const SizedBox(height: 14),
                const CodeLabel('explore'),
                const SizedBox(height: 4),
                Text(AppConfig.clubName, style: displayStyle(context, 24)),
              ]),
            ),
            for (final t in _tabs) tile(t),
            Divider(color: p.line, indent: 24, endIndent: 24),
            for (final t in _more) tile(t),
            Divider(color: p.line, indent: 24, endIndent: 24),
            ListTile(
              leading: Icon(Icons.auto_awesome_rounded, color: p.pink),
              title: Text('AI assistant', style: bodyStyle(context, weight: FontWeight.w600)),
              onTap: () {
                Navigator.pop(context);
                context.push('/chat');
              },
            ),
            ListTile(
              leading: Icon(Icons.admin_panel_settings_outlined, color: p.muted),
              title: Text(isAdmin ? 'Admin dashboard' : 'Admin login', style: bodyStyle(context, weight: FontWeight.w600)),
              onTap: () {
                Navigator.pop(context);
                context.push('/admin');
              },
            ),
          ],
        ),
      ),
    );
  }
}
