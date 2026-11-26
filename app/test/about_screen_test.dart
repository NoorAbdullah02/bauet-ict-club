import 'package:bauet_ict_club/core/theme.dart';
import 'package:bauet_ict_club/data/api.dart';
import 'package:bauet_ict_club/models/models.dart';
import 'package:bauet_ict_club/screens/about_screen.dart';
import 'package:bauet_ict_club/state/app_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('About shows the What We Do texts an admin saved, with the activity cards', (tester) async {
    final state = AppState(api: Api())
      ..settings = SiteSettings.fromJson({
        'aboutText': 'A club for builders.',
        'aboutWhatWeDo': 'Build with us',
        'aboutWhatWeDoSub': 'Weekly sessions in the ICT lab',
      })
      ..loading = false
      ..loadedOnce = true;

    await tester.pumpWidget(ChangeNotifierProvider<AppState>.value(
      value: state,
      child: MaterialApp(theme: buildTheme(Pal.lightPal), home: const AboutScreen()),
    ));
    await tester.pump(const Duration(milliseconds: 900));

    expect(find.text('Build with us'), findsOneWidget);
    expect(find.text('Weekly sessions in the ICT lab'), findsOneWidget);
    // the cards from the website's What We Do block, not just a heading
    expect(find.text('Workshops'), findsOneWidget);
    expect(find.text('Hackathons'), findsOneWidget);
    expect(find.text('Networking'), findsOneWidget);
  });

  testWidgets('About keeps the built-in What We Do wording when the admin left it blank', (tester) async {
    final state = AppState(api: Api())
      ..settings = const SiteSettings()
      ..loading = false
      ..loadedOnce = true;

    await tester.pumpWidget(ChangeNotifierProvider<AppState>.value(
      value: state,
      child: MaterialApp(theme: buildTheme(Pal.lightPal), home: const AboutScreen()),
    ));
    await tester.pump(const Duration(milliseconds: 900));

    expect(find.text('What We Do'), findsOneWidget);
    expect(find.text('Activities that shape future tech leaders'), findsOneWidget);
  });
}
