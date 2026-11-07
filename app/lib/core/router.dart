import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'theme.dart';

import '../screens/about_screen.dart';
import '../screens/achievements_screen.dart';
import '../screens/admin/admin_applications_screen.dart';
import '../screens/admin/admin_activity_screen.dart';
import '../screens/admin/admin_checkin_screen.dart';
import '../screens/admin/admin_forms_screen.dart';
import '../screens/admin/admin_inbox_screen.dart';
import '../screens/admin/admin_insights_screen.dart';
import '../screens/admin/admin_links_screen.dart';
import '../screens/admin/admin_newsletter_screen.dart';
import '../screens/admin/admin_team_screen.dart';
import '../screens/admin/admin_transfer_screen.dart';
import '../screens/admin/admin_committees_screen.dart';
import '../screens/admin/admin_security_screen.dart';
import '../screens/admin/admin_signups_screen.dart';
import '../screens/admin/admin_crud_screen.dart';
import '../screens/admin/admin_home_screen.dart';
import '../screens/admin/admin_login_screen.dart';
import '../screens/admin/admin_signup_screen.dart';
import '../screens/admin/admin_settings_screen.dart';
import '../screens/admin/admin_trash_screen.dart';
import '../screens/admin/admin_visitors_screen.dart';
import '../screens/ambassadors_screen.dart';
import '../screens/chat_screen.dart';
import '../screens/contact_screen.dart';
import '../screens/event_detail_screen.dart';
import '../screens/events_screen.dart';
import '../screens/member_card_screen.dart';
import '../screens/public_form_screen.dart';
import '../screens/search_screen.dart';
import '../screens/ticket_screen.dart';
import '../screens/verify_screen.dart';
import '../screens/not_found_screen.dart';
import '../screens/gallery_screen.dart';
import '../screens/home_screen.dart';
import '../screens/join/join_ambassador_screen.dart';
import '../screens/join/join_committee_screen.dart';
import '../screens/join/join_general_screen.dart';
import '../screens/join/join_hub_screen.dart';
import '../screens/faq_screen.dart';
import '../screens/notices_screen.dart';
import '../screens/projects_screen.dart';
import '../screens/resources_screen.dart';
import '../screens/leaderboard_screen.dart';
import '../screens/contests_screen.dart';
import '../screens/jobs_screen.dart';
import '../screens/my_card_screen.dart';
import '../screens/contest_detail_screen.dart';
import '../screens/admin/admin_contest_teams_screen.dart';
import '../screens/admin/admin_event_studio_screen.dart';
import '../screens/admin/admin_site_texts_screen.dart';
import '../screens/admin/admin_points_screen.dart';
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
      final isAdminArea = loc.startsWith('/admin') && loc != '/admin/login' && loc != '/admin/signup';
      if (isAdminArea && !state.isAdmin) return '/admin/login';
      if ((loc == '/admin/login' || loc == '/admin/signup') && state.isAdmin) return '/admin';
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
          GoRoute(path: '/ambassadors', pageBuilder: (c, s) => _fade(s, const AmbassadorsScreen())),
          GoRoute(path: '/gallery', pageBuilder: (c, s) => _fade(s, const GalleryScreen())),
          GoRoute(path: '/achievements', pageBuilder: (c, s) => _fade(s, const AchievementsScreen())),
          GoRoute(path: '/projects', pageBuilder: (c, s) => _fade(s, const ProjectsScreen())),
          GoRoute(path: '/resources', pageBuilder: (c, s) => _fade(s, const ResourcesScreen())),
          GoRoute(path: '/leaderboard', pageBuilder: (c, s) => _fade(s, const LeaderboardScreen())),
          GoRoute(path: '/contests', pageBuilder: (c, s) => _fade(s, const ContestsScreen())),
          GoRoute(path: '/jobs', pageBuilder: (c, s) => _fade(s, const JobsScreen())),
          GoRoute(path: '/jobs/remote', pageBuilder: (c, s) => _fade(s, const JobsScreen(remote: true))),
          GoRoute(path: '/faq', pageBuilder: (c, s) => _fade(s, const FaqScreen())),
          GoRoute(path: '/about', pageBuilder: (c, s) => _fade(s, const AboutScreen())),
          GoRoute(path: '/contact', pageBuilder: (c, s) => _fade(s, const ContactScreen())),
          GoRoute(path: '/join', pageBuilder: (c, s) => _fade(s, const JoinHubScreen())),
        ],
      ),
      GoRoute(path: '/join/committee', pageBuilder: (c, s) => _slide(s, const JoinCommitteeScreen())),
      GoRoute(path: '/join/ambassador', pageBuilder: (c, s) => _slide(s, const JoinAmbassadorScreen())),
      GoRoute(path: '/join/general', pageBuilder: (c, s) => _slide(s, const JoinGeneralScreen())),
      GoRoute(
        path: '/events/:id',
        pageBuilder: (c, s) => _slide(s, EventDetailScreen(eventId: int.tryParse(s.pathParameters['id'] ?? '') ?? 0)),
      ),
      GoRoute(path: '/search', pageBuilder: (c, s) => _slide(s, const SearchScreen())),
      GoRoute(
        path: '/card/:id',
        pageBuilder: (c, s) => _slide(s, MemberCardScreen(memberId: s.pathParameters['id'] ?? '', code: s.uri.queryParameters['c'])),
      ),
      GoRoute(path: '/contests/:id', pageBuilder: (c, s) => _slide(s, ContestDetailScreen(id: int.tryParse(s.pathParameters['id'] ?? '') ?? 0))),
      GoRoute(path: '/my-card', pageBuilder: (c, s) => _slide(s, const MyCardScreen())),
      GoRoute(path: '/tickets', pageBuilder: (c, s) => _slide(s, const MyTicketsScreen())),
      GoRoute(path: '/ticket/:code', pageBuilder: (c, s) => _slide(s, TicketScreen(code: s.pathParameters['code'] ?? ''))),
      GoRoute(path: '/verify/:code', pageBuilder: (c, s) => _slide(s, VerifyScreen(code: s.pathParameters['code'] ?? ''))),
      GoRoute(path: '/f/:slug', pageBuilder: (c, s) => _slide(s, PublicFormScreen(slug: s.pathParameters['slug'] ?? ''))),
      GoRoute(path: '/chat', pageBuilder: (c, s) => _slide(s, const ChatScreen())),
      GoRoute(path: '/admin/signup', pageBuilder: (c, s) => _slide(s, _admin(const AdminSignupScreen()))),
      GoRoute(path: '/admin/login', pageBuilder: (c, s) => _slide(s, _admin(const AdminLoginScreen()))),
      GoRoute(path: '/admin', pageBuilder: (c, s) => _slide(s, _admin(const AdminHomeScreen()))),
      GoRoute(path: '/admin/applications', pageBuilder: (c, s) => _slide(s, _admin(const AdminApplicationsScreen()))),
      GoRoute(path: '/admin/visitors', pageBuilder: (c, s) => _slide(s, _admin(const AdminVisitorsScreen()))),
      GoRoute(path: '/admin/trash', pageBuilder: (c, s) => _slide(s, _admin(const AdminTrashScreen()))),
      GoRoute(path: '/admin/committees', pageBuilder: (c, s) => _slide(s, _admin(const AdminCommitteesScreen()))),
      GoRoute(path: '/admin/checkin', pageBuilder: (c, s) => _slide(s, _admin(const AdminCheckinScreen()))),
      GoRoute(path: '/admin/signups', pageBuilder: (c, s) => _slide(s, _admin(const AdminSignupsScreen()))),
      GoRoute(path: '/admin/contest/:id', pageBuilder: (c, s) => _slide(s, _admin(AdminContestTeamsScreen(id: int.tryParse(s.pathParameters['id'] ?? '') ?? 0)))),
      GoRoute(path: '/admin/site', pageBuilder: (c, s) => _slide(s, _admin(const AdminSiteTextsScreen()))),
      GoRoute(path: '/admin/event-studio', pageBuilder: (c, s) => _slide(s, _admin(const AdminEventStudioScreen()))),
      GoRoute(path: '/admin/points', pageBuilder: (c, s) => _slide(s, _admin(const AdminPointsScreen()))),
      GoRoute(path: '/admin/insights', pageBuilder: (c, s) => _slide(s, _admin(const AdminInsightsScreen()))),
      GoRoute(path: '/admin/activity', pageBuilder: (c, s) => _slide(s, _admin(const AdminActivityScreen()))),
      GoRoute(path: '/admin/team', pageBuilder: (c, s) => _slide(s, _admin(const AdminTeamScreen()))),
      GoRoute(path: '/admin/newsletter', pageBuilder: (c, s) => _slide(s, _admin(const AdminNewsletterScreen()))),
      GoRoute(path: '/admin/inbox', pageBuilder: (c, s) => _slide(s, _admin(const AdminInboxScreen()))),
      GoRoute(path: '/admin/links', pageBuilder: (c, s) => _slide(s, _admin(const AdminLinksScreen()))),
      GoRoute(path: '/admin/transfer', pageBuilder: (c, s) => _slide(s, _admin(const AdminTransferScreen()))),
      GoRoute(path: '/admin/forms', pageBuilder: (c, s) => _slide(s, _admin(const AdminFormsScreen()))),
      GoRoute(
        path: '/admin/forms/:id',
        pageBuilder: (c, s) => _slide(s, _admin(AdminFormEditScreen(formId: int.tryParse(s.pathParameters['id'] ?? '') ?? 0))),
      ),
      GoRoute(
        path: '/admin/forms/:id/responses',
        pageBuilder: (c, s) => _slide(s, _admin(AdminFormResponsesScreen(formId: int.tryParse(s.pathParameters['id'] ?? '') ?? 0))),
      ),
      GoRoute(
        path: '/admin/event-form/:id',
        pageBuilder: (c, s) => _slide(s, _admin(AdminFormEditScreen(eventId: int.tryParse(s.pathParameters['id'] ?? '') ?? 0))),
      ),
      GoRoute(path: '/admin/security', pageBuilder: (c, s) => _slide(s, _admin(const AdminSecurityScreen()))),
      GoRoute(path: '/admin/settings', pageBuilder: (c, s) => _slide(s, _admin(const AdminSettingsScreen()))),
      GoRoute(
        path: '/admin/data/:table',
        pageBuilder: (c, s) => _slide(s, _admin(AdminCrudScreen(table: s.pathParameters['table'] ?? 'events'))),
      ),
    ],
  );
}
