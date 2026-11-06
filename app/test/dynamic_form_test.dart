import 'package:bauet_ict_club/core/forms.dart';
import 'package:bauet_ict_club/core/theme.dart';
import 'package:bauet_ict_club/data/api.dart';
import 'package:bauet_ict_club/widgets/dynamic_form.dart';
import 'package:bauet_ict_club/widgets/payment_box.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

Widget host(Widget child) => MaterialApp(theme: buildTheme(Pal.lightPal), home: Scaffold(body: SingleChildScrollView(child: child)));

Finder label(String t) => find.textContaining(t, findRichText: true);

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('draws every question type, shows only the first page, then moves on', (tester) async {
    final fields = <Q>[
      {'id': 'name', 'type': 'short', 'label': 'Full name', 'required': true},
      {'id': 'mail', 'type': 'email', 'label': 'Email'},
      {'id': 'dept', 'type': 'dropdown', 'label': 'Department', 'options': ['ICE', 'CSE'], 'allowOther': true},
      {'id': 'pick', 'type': 'radio', 'label': 'Lunch', 'options': ['Yes', 'No'], 'allowOther': true},
      {'id': 'multi', 'type': 'checkbox', 'label': 'Topics', 'options': ['AI', 'Web'], 'allowOther': true},
      {'id': 'rate', 'type': 'scale', 'label': 'Rating', 'scale': {'max': 5, 'low': 'Bad', 'high': 'Good'}},
      {'id': 'yn', 'type': 'yesno', 'label': 'Member?'},
      {'id': 'd', 'type': 'date', 'label': 'Birthday'},
      {'id': 't', 'type': 'time', 'label': 'Time'},
      {'id': 'n', 'type': 'number', 'label': 'Age'},
      {'id': 'ph', 'type': 'photo', 'label': 'Picture'},
      {'id': 'x', 'type': 'short', 'label': 'Only if yes', 'showIf': {'field': 'yn', 'equals': 'Yes'}},
      {'id': 'sec', 'type': 'section', 'label': 'Page two', 'page': true},
      {'id': 'last', 'type': 'long', 'label': 'Comments'},
    ];
    final values = <String, dynamic>{};
    var errors = <String, String>{};
    late StateSetter set;
    await tester.pumpWidget(host(StatefulBuilder(builder: (context, setState) {
      set = setState;
      return DynamicFormView(
        fields: fields,
        values: values,
        errors: errors,
        api: Api(),
        onErrors: (m) => set(() => errors = m),
        onChanged: (id, v) => set(() => values[id] = v),
        footer: const Text('FOOTER'),
      );
    })));
    expect(find.text('PAGE 1 OF 2'), findsOneWidget);
    expect(label('Full name'), findsOneWidget);
    expect(label('Only if yes'), findsNothing);
    expect(label('Comments'), findsNothing);
    expect(find.text('FOOTER'), findsNothing);

    await tester.ensureVisible(find.text('Yes').last);
    await tester.tap(find.text('Yes').last);
    await tester.pump();
    expect(label('Only if yes'), findsOneWidget);

    // next with a required question empty: stays on page 1 and shows the problem
    await tester.ensureVisible(find.text('Next'));
    await tester.tap(find.text('Next'));
    await tester.pump();
    expect(find.text('PAGE 1 OF 2'), findsOneWidget);
    expect(errors['name'], 'This question is required');

    await tester.enterText(find.byType(TextField).first, 'Rahim');
    await tester.pump();
    expect(values['name'], 'Rahim');
    await tester.ensureVisible(find.text('Next'));
    await tester.tap(find.text('Next'));
    await tester.pump();
    expect(find.text('PAGE 2 OF 2'), findsOneWidget);
    expect(label('Comments'), findsOneWidget);
    expect(find.text('FOOTER'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('payment box shows the number and reports what was typed', (tester) async {
    Map<String, String> got = {};
    await tester.pumpWidget(host(StatefulBuilder(builder: (context, setState) {
      return PaymentBox(
        setting: const {
          'enabled': true,
          'amount': 200,
          'methods': ['bKash', 'Nagad'],
          'numbers': {'bKash': '01711111111', 'Nagad': '01822222222'},
        },
        value: got,
        errors: const {},
        onChanged: (v) => setState(() => got = v),
      );
    })));
    expect(find.text('01711111111'), findsOneWidget);
    await tester.tap(find.text('Nagad'));
    await tester.pump();
    expect(find.text('01822222222'), findsOneWidget);
    await tester.enterText(find.byType(TextField).last, 'ab12cd34ef');
    await tester.pump();
    expect(got['trx_id'], 'AB12CD34EF');
    expect(got['method'], 'Nagad');
  });

  testWidgets('payment box offers both ways and the choice is reported', (tester) async {
    Map<String, String> got = {};
    await tester.pumpWidget(host(StatefulBuilder(builder: (context, setState) {
      return PaymentBox(
        gateway: true,
        setting: const {
          'enabled': true,
          'amount': 200,
          'manual': true,
          'online': true,
          'methods': ['bKash'],
          'numbers': {'bKash': '01711111111'},
        },
        value: got,
        errors: const {},
        onChanged: (v) => setState(() => got = v),
      );
    })));
    expect(find.text('Pay online'), findsWidgets);
    expect(find.text('Send money by hand'), findsOneWidget);
    expect(find.text('01711111111'), findsOneWidget); // by hand is the first way offered
    await tester.tap(find.text('Pay online').first);
    await tester.pump();
    expect(got['mode'], 'online');
    expect(find.text('01711111111'), findsNothing); // the number box is hidden while paying online
  });

  testWidgets('online payment is hidden when the gateway is not set up', (tester) async {
    await tester.pumpWidget(host(PaymentBox(
      gateway: false,
      setting: const {'enabled': true, 'amount': 100, 'manual': true, 'online': true, 'methods': ['bKash'], 'numbers': {'bKash': '01711111111'}},
      value: const {},
      errors: const {},
      onChanged: (_) {},
    )));
    expect(find.text('Send money by hand'), findsNothing); // only one way left, so no chooser
    expect(find.text('01711111111'), findsOneWidget);
  });
}
