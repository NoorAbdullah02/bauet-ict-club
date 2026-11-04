import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'theme.dart';

import '../screens/about_screen.dart';
import '../screens/achievements_screen.dart';
import '../screens/admin/admin_applications_screen.dart';
import '../screens/admin/admin_crud_screen.dart';
import '../screens/admin/admin_home_screen.dart';
import '../screens/admin/admin_login_screen.dart';
import '../screens/chat_screen.dart';
import '../screens/contact_screen.dart';
import '../screens/events_screen.dart';
import '../screens/not_found_screen.dart';
import '../screens/gallery_screen.dart';
import '../screens/home_screen.dart';
import '../screens/join/join_committee_screen.dart';
import '../screens/join/join_general_screen.dart';
import '../screens/join/join_hub_screen.dart';
import '../screens/notices_screen.dart';
import '../screens/splash_screen.dart';
import '../screens/team_screen.dart';
import '../state/app_state.dart';
import '../widgets/shell.dart';

CustomTransitionPage<void> _fade(GoRouterState s, Widget child) => CustomTransitionPage<void>(
      key: s.pageKey,
      child: child,
      transitionDuration: const Duration(milliseconds: 280),
      transitionsBuilder: (context, anim, _, c) => FadeTransition(opacity: CurvedAnimation(parent: anim, curve: Curves.easeOut), child: c),
    );

CustomTransitionPage<void> _slide(GoRouterState s, Widget child) => CustomTransitionPage<void>(
      key: s.pageKey,
      child: child,
      transitionDuration: const Duration(milliseconds: 380),
      transitionsBuilder: (context, anim, _, c) {
        final curved = CurvedAnimation(parent: anim, curve: Curves.easeOutCubic);
        return SlideTransition(
          position: Tween(begin: const Offset(0.12, 0), end: Offset.zero).animate(curved),
          child: FadeTransition(opacity: curved, child: c),
        );
      },
    );

/// Admin pages use their own theme (white by default, toggle in each header).
Widget _admin(Widget child) => Builder(builder: (context) {
      final dark = context.select<AppState, bool>((s) => s.adminDark);
      return Theme(data: buildTheme(dark ? Pal.darkPal : Pal.lightPal), child: child);
    });

GoRouter buildRouter(AppState state) {
  return GoRouter(
    initialLocation: '/splash',
    errorBuilder: (context, state) => NotFoundScreen(path: state.uri.toString()),
    refreshListenable: state,
    redirect: (context, route) {
      final loc = route.matchedLocation;
      final isAdminArea = loc.startsWith('/admin') && loc != '/admin/login';
      if (isAdminArea && !state.isAdmin) return '/admin/login';
      if (loc == '/admin/login' && state.isAdmin) return '/admin';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', pageBuilder: (c, s) => _fade(s, const SplashScreen())),
      ShellRoute(
        builder: (context, state, child) => AppShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(path: '/home', pageBuilder: (c, s) => _fade(s, const HomeScreen())),
          GoRoute(path: '/events', pageBuilder: (c, s) => _fade(s, const EventsScreen())),
          GoRoute(path: '/notices', pageBuilder: (c, s) => _fade(s, const NoticesScreen())),
          GoRoute(path: '/team', pageBuilder: (c, s) => _fade(s, const TeamScreen())),
          GoRoute(path: '/gallery', pageBuilder: (c, s) => _fade(s, const GalleryScreen())),
          GoRoute(path: '/achievements', pageBuilder: (c, s) => _fade(s, const AchievementsScreen())),
          GoRoute(path: '/about', pageBuilder: (c, s) => _fade(s, const AboutScreen())),
          GoRoute(path: '/contact', pageBuilder: (c, s) => _fade(s, const ContactScreen())),
          GoRoute(path: '/join', pageBuilder: (c, s) => _fade(s, const JoinHubScreen())),
        ],
      ),
      GoRoute(path: '/join/committee', pageBuilder: (c, s) => _slide(s, const JoinCommitteeScreen())),
      GoRoute(path: '/join/general', pageBuilder: (c, s) => _slide(s, const JoinGeneralScreen())),
      GoRoute(path: '/chat', pageBuilder: (c, s) => _slide(s, const ChatScreen())),
      GoRoute(path: '/admin/login', pageBuilder: (c, s) => _slide(s, _admin(const AdminLoginScreen()))),
      GoRoute(path: '/admin', pageBuilder: (c, s) => _slide(s, _admin(const AdminHomeScreen()))),
      GoRoute(path: '/admin/applications', pageBuilder: (c, s) => _slide(s, _admin(const AdminApplicationsScreen()))),
      GoRoute(
        path: '/admin/data/:table',
        pageBuilder: (c, s) => _slide(s, _admin(AdminCrudScreen(table: s.pathParameters['table'] ?? 'events'))),
      ),
    ],
  );
}
