import 'package:bauet_ict_club/core/theme.dart';
import 'package:bauet_ict_club/data/api.dart';
import 'package:bauet_ict_club/screens/admin/admin_home_screen.dart';
import 'package:bauet_ict_club/screens/admin/admin_settings_screen.dart';
import 'package:bauet_ict_club/state/app_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

/// Signs in as an editor and answers the admin home's list calls with nothing.
class _FakeApi extends Api {
  int demoCountCalls = 0;

  @override
  Future<List<Map<String, dynamic>>> list(String table,
          {bool fresh = false}) async =>
      [];

  @override
  Future<Map<String, dynamic>> serviceStatus(String path) async => {};

  @override
  Future<int> demoCount() async {
    demoCountCalls++;
    return 3;
  }

  @override
  Future<Map<String, dynamic>> login(String username, String password,
          {String? code}) async =>
      {
        'token': 'token-123',
        'user': {'username': username, 'role': 'editor'}
      };

  @override
  Future<dynamic> adminCall(String method, String path,
          {Object? data, Map<String, dynamic>? query}) async =>
      {'username': 'noor', 'role': 'editor'};
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  Future<void> openHome(WidgetTester tester, AppState state) async {
    // tall enough that the lazy ListView builds every tile, so a hidden tile really is absent
    tester.view.physicalSize = const Size(1000, 8000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(ChangeNotifierProvider<AppState>.value(
      value: state,
      child: MaterialApp(
          theme: buildTheme(Pal.lightPal), home: const AdminHomeScreen()),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));
  }

  test('signing in keeps the role the server reports', () async {
    final state = AppState(api: _FakeApi());
    await state.login('noor', 'secret');
    expect(state.adminName, 'noor');
    expect(state.adminRole, 'editor');
    expect(state.isEditor, isTrue);
    expect(state.isSuperAdmin, isFalse);
  });

  test('a refused action (403) keeps the session; an ended one (401) signs out',
      () async {
    final state = AppState(api: _FakeApi())..adminRole = 'editor';
    state.api.token = 'token-123';

    await state.handleAuthError(
        ApiException('Your login can edit but cannot do this.', status: 403));
    expect(state.api.token, 'token-123');

    await state.handleAuthError(
        ApiException('Session ended. Please sign in again.', status: 401));
    expect(state.api.token, isNull);
  });

  testWidgets(
      'an editor sees only the areas the server allows, and the EDITOR role',
      (tester) async {
    final state = AppState(api: _FakeApi())
      ..adminName = 'noor'
      ..adminRole = 'editor';
    await openHome(tester, state);

    for (final hidden in [
      'Trash',
      'Activity log',
      'Downloads',
      'Newsletter',
      'Committees',
      'Transfer people',
      'Team logins'
    ]) {
      expect(find.text(hidden), findsNothing,
          reason: '$hidden must stay hidden for an editor');
    }
    expect(find.text('EDITOR'), findsOneWidget);
    expect(find.text('Team members'), findsOneWidget);
    expect(find.text('Events'), findsOneWidget);
    // Settings stays open: connection status is allowed, only the demo card inside is not
    expect(find.text('Settings'), findsOneWidget);
  });

  testWidgets('an editor opens Settings but never asks for or shows demo data',
      (tester) async {
    final api = _FakeApi();
    final state = AppState(api: api)..adminRole = 'editor';
    await tester.pumpWidget(ChangeNotifierProvider<AppState>.value(
      value: state,
      child: MaterialApp(
          theme: buildTheme(Pal.lightPal), home: const AdminSettingsScreen()),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Remove demo data'), findsNothing);
    expect(api.demoCountCalls,
        0); // the server would answer 403, so it is not even asked
  });

  testWidgets('the main admin still sees every tile', (tester) async {
    final state = AppState(api: _FakeApi())
      ..adminName = 'noor'
      ..adminRole = 'superadmin';
    await openHome(tester, state);

    for (final shown in [
      'Trash',
      'Activity log',
      'Downloads',
      'Newsletter',
      'Committees',
      'Transfer people',
      'Team logins',
      'Settings'
    ]) {
      expect(find.text(shown), findsOneWidget,
          reason: '$shown belongs to the main admin');
    }
    expect(find.text('MAIN ADMIN'), findsOneWidget);
  });
}
