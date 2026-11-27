import 'package:bauet_ict_club/core/theme.dart';
import 'package:bauet_ict_club/screens/admin/admin_widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  test('matchesQuery supports multi-word and case-insensitive search', () {
    final fields = ['Tanvir Ahmed', '21020123', 'ICE', 'President'];
    expect(matchesQuery('', fields), isTrue);
    expect(matchesQuery('tanvir', fields), isTrue);
    expect(matchesQuery('ice pres', fields), isTrue);
    expect(matchesQuery('21020123 tanvir', fields), isTrue);
    expect(matchesQuery('cse', fields), isFalse);
  });

  testWidgets('AdminSearchBar filters and clears cleanly', (tester) async {
    final ctrl = TextEditingController();
    addTearDown(ctrl.dispose);
    var latest = '';

    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(Pal.lightPal),
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => AdminSearchBar(
              controller: ctrl,
              hint: 'Search members…',
              shown: latest == 'tanvir' ? 1 : 5,
              total: 5,
              onChanged: (v) => setState(() => latest = v),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Search members…'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'tanvir');
    await tester.pump();

    expect(latest, 'tanvir');
    expect(find.text('1/5'), findsOneWidget);
    expect(find.byIcon(Icons.close_rounded), findsOneWidget);

    await tester.tap(find.byIcon(Icons.close_rounded));
    await tester.pump();
    expect(latest, '');
    expect(ctrl.text, isEmpty);
  });
}
