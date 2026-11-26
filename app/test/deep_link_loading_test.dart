import 'package:bauet_ict_club/core/theme.dart';
import 'package:bauet_ict_club/data/api.dart';
import 'package:bauet_ict_club/screens/team_screen.dart';
import 'package:bauet_ict_club/state/app_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

/// Answers the single bootstrap request the app makes on start.
class _FakeApi extends Api {
  int bootstrapCalls = 0;

  @override
  Future<Map<String, dynamic>> bootstrap({bool fresh = false}) async {
    bootstrapCalls++;
    return {
      'events': <dynamic>[],
      'members': <dynamic>[
        {
          'id': 1,
          'name': 'Nusrat Jahan',
          'position': 'Vice President (Administration)',
          'committee_session': 'Summer 2026',
          'display_order': 1,
        },
      ],
      'settings': <String, dynamic>{},
    };
  }

  @override
  Future<Map<String, dynamic>> settings({bool fresh = false}) async => {};
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  test('ensureLoaded loads the site once, even when more than one screen asks', () async {
    final api = _FakeApi();
    final state = AppState(api: api);

    await Future.wait([state.ensureLoaded(), state.ensureLoaded()]);
    expect(api.bootstrapCalls, 1);
    expect(state.loadedOnce, isTrue);
    expect(state.loading, isFalse);
    expect(state.teamMembers.single.name, 'Nusrat Jahan');

    await state.ensureLoaded(); // a finished load is reused, not repeated
    expect(api.bootstrapCalls, 1);
  });

  testWidgets('a page opened by a direct link shows its content instead of the skeleton', (tester) async {
    final state = AppState(api: _FakeApi());
    await tester.pumpWidget(ChangeNotifierProvider<AppState>.value(
      value: state,
      child: MaterialApp(theme: buildTheme(Pal.lightPal), home: const TeamScreen()),
    ));
    expect(find.text('Nusrat Jahan'), findsNothing);

    // what the app itself does on start, whether or not the splash screen is the first page
    await state.ensureLoaded();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.text('Nusrat Jahan'), findsOneWidget);
  });
}
