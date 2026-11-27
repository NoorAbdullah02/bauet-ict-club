import 'package:bauet_ict_club/core/theme.dart';
import 'package:bauet_ict_club/data/api.dart';
import 'package:bauet_ict_club/models/models.dart';
import 'package:bauet_ict_club/screens/team_screen.dart';
import 'package:bauet_ict_club/state/app_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

/// The committee list as the server sends it: exactly one session can carry is_current.
class _FakeApi extends Api {
  @override
  Future<List<Map<String, dynamic>>> committees() async => [
        {'label': 'Summer 2026', 'members': 2, 'is_current': false},
        {'label': 'Winter 2025', 'members': 1, 'is_current': true},
      ];
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  test('settings carry the admin-marked current committee', () {
    expect(SiteSettings.fromJson({'current_session': 'Winter 2025'}).currentSession, 'Winter 2025');
    expect(const SiteSettings().currentSession, '');
    expect(SiteSettings.fromJson({'current_session': null}).currentSession, '');
  });

  testWidgets('the team page opens on the committee marked current, not the newest',
      (tester) async {
    final state = AppState(api: _FakeApi())
      ..settings = const SiteSettings(currentSession: 'Winter 2025')
      ..loading = false
      ..loadedOnce = true
      ..members = [
        Member.fromJson({
          'id': 1,
          'name': 'Newest Person',
          'position': 'Executive Member',
          'committee_session': 'Summer 2026',
        }),
        Member.fromJson({
          'id': 2,
          'name': 'Running Person',
          'position': 'Executive Member',
          'committee_session': 'Winter 2025',
        }),
      ];

    await tester.pumpWidget(ChangeNotifierProvider<AppState>.value(
      value: state,
      child: MaterialApp(theme: buildTheme(Pal.lightPal), home: const TeamScreen()),
    ));
    await tester.pump(const Duration(milliseconds: 900));

    expect(find.text('Running Person'), findsOneWidget);
    expect(find.text('Newest Person'), findsNothing);
  });
}
