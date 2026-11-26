import 'package:bauet_ict_club/core/theme.dart';
import 'package:bauet_ict_club/data/api.dart';
import 'package:bauet_ict_club/screens/admin/admin_security_screen.dart';
import 'package:bauet_ict_club/state/app_state.dart';
import 'package:bauet_ict_club/widgets/common.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

/// Answers the two-factor status call and records the password change.
class _FakeApi extends Api {
  Map<String, dynamic>? passwordBody;
  int passwordCalls = 0;

  @override
  Future<Map<String, dynamic>> authGet(String path) async => {'enabled': false, 'backupCodesLeft': 0};

  @override
  Future<Map<String, dynamic>> authPost(String path, [Map<String, dynamic>? body]) async {
    if (path == '/auth/change-password') {
      passwordCalls++;
      passwordBody = body;
      return {'ok': true, 'token': 'fresh-token'};
    }
    return {'ok': true};
  }
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  Future<void> open(WidgetTester tester, _FakeApi api, AppState state) async {
    tester.view.physicalSize = const Size(900, 2600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(ChangeNotifierProvider<AppState>.value(
      value: state,
      child: MaterialApp(theme: buildTheme(Pal.lightPal), home: const AdminSecurityScreen()),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
  }

  testWidgets('an admin can change their own password, and this device keeps a fresh session', (tester) async {
    final api = _FakeApi();
    final state = AppState(api: api);
    await open(tester, api, state);

    expect(find.text('Change password'), findsWidgets);
    await tester.enterText(find.widgetWithText(TextField, 'Current password'), 'old-secret1');
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-secret2');
    await tester.enterText(find.widgetWithText(TextField, 'Repeat new password'), 'new-secret2');
    await tester.tap(find.widgetWithText(GradientButton, 'Change password'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(api.passwordCalls, 1);
    expect(api.passwordBody, {'current': 'old-secret1', 'next': 'new-secret2'});
    expect(state.api.token, 'fresh-token'); // the other devices are signed out, this one is not
  });

  testWidgets('a mistyped repeat is refused before anything is sent', (tester) async {
    final api = _FakeApi();
    final state = AppState(api: api);
    await open(tester, api, state);

    await tester.enterText(find.widgetWithText(TextField, 'Current password'), 'old-secret1');
    await tester.enterText(find.widgetWithText(TextField, 'New password'), 'new-secret2');
    await tester.enterText(find.widgetWithText(TextField, 'Repeat new password'), 'new-secret3');
    await tester.tap(find.widgetWithText(GradientButton, 'Change password'));
    await tester.pump();

    expect(find.text('The two new passwords do not match'), findsOneWidget);
    expect(api.passwordCalls, 0);
  });
}
