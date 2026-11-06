import 'package:bauet_ict_club/core/forms.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('event form rules (mirror the website)', () {
    test('default questions when none were built', () {
      final f = fieldsOfForm({});
      expect(f.length, 6);
      expect(qId(f.first), 'name');
      expect(qRequired(f.first), isTrue);
    });

    test('blank answers', () {
      expect(isBlank(null), isTrue);
      expect(isBlank(''), isTrue);
      expect(isBlank(kOther), isTrue);
      expect(isBlank([kOther]), isTrue);
      expect(isBlank('x'), isFalse);
      expect(isBlank(['a']), isFalse);
    });

    test('required and pattern problems', () {
      final fields = <Q>[
        {'id': 'a', 'type': 'short', 'label': 'ID', 'required': true, 'pattern': r'^\d{7}$', 'patternMsg': 'Seven digits'},
        {'id': 'b', 'type': 'number', 'label': 'Age', 'min': 10, 'max': 30, 'whole': true},
      ];
      expect(problemsOf(fields, {})['a'], 'This question is required');
      expect(problemsOf(fields, {'a': '12ab'})['a'], 'Seven digits');
      expect(problemsOf(fields, {'a': '1234567'}).containsKey('a'), isFalse);
      expect(problemsOf(fields, {'a': '1234567', 'b': '5'})['b'], 'Must be at least 10');
      expect(problemsOf(fields, {'a': '1234567', 'b': '12.5'})['b'], 'Enter a whole number');
      expect(problemsOf(fields, {'a': '1234567', 'b': '20'}).isEmpty, isTrue);
    });

    test('checkbox limits', () {
      final f = <String, dynamic>{'id': 'c', 'type': 'checkbox', 'minSel': 2, 'maxSel': 3};
      expect(ruleProblem(f, ['a']), 'Choose at least 2');
      expect(ruleProblem(f, ['a', 'b', 'c', 'd']), 'Choose at most 3');
      expect(ruleProblem(f, ['a', 'b']), '');
    });

    test('conditional questions follow an earlier answer', () {
      final f = <String, dynamic>{'id': 'x', 'type': 'short', 'showIf': {'field': 'q', 'equals': 'Yes'}};
      expect(isVisibleQ(f, {'q': 'Yes'}), isTrue);
      expect(isVisibleQ(f, {'q': 'No'}), isFalse);
      expect(isVisibleQ(f, {}), isFalse);
      expect(isVisibleQ({'id': 'y'}, {}), isTrue);
    });

    test('hidden and empty answers are not sent', () {
      final fields = <Q>[
        {'id': 'q', 'type': 'yesno'},
        {'id': 'x', 'type': 'short', 'showIf': {'field': 'q', 'equals': 'Yes'}},
        {'id': 'h', 'type': 'section', 'label': 'Heading'},
      ];
      expect(answersToSend(fields, {'q': 'No', 'x': 'secret'}), {'q': 'No'});
      expect(answersToSend(fields, {'q': 'Yes', 'x': 'ok'}), {'q': 'Yes', 'x': 'ok'});
    });

    test('multi-page forms split at headings that start a new page', () {
      final fields = <Q>[
        {'id': '1', 'type': 'short'},
        {'id': 's', 'type': 'section', 'page': true},
        {'id': '2', 'type': 'short'},
      ];
      final pages = pagesOfForm(fields);
      expect(pages.length, 2);
      expect(pages[1].length, 2);
    });
  });

  group('tickets and links', () {
    test('ticket code is shown in groups of four', () {
      expect(prettyCode('abcd1234efgh'), 'ABCD 1234 EFGH');
    });

    test('pasted links and codes are understood', () {
      expect(parseOpenable('https://x.com/ticket/abcd-1234-efgh')?.kind, 'ticket');
      expect(parseOpenable('https://x.com/ticket/abcd-1234-efgh')?.value, 'ABCD1234EFGH');
      expect(parseOpenable('https://x.com/f/feedback')?.value, 'feedback');
      expect(parseOpenable('https://x.com/events/12')?.kind, 'event');
      expect(parseOpenable('https://x.com/verify/abcd-1234-efgh')?.kind, 'verify');
      expect(parseOpenable('https://x.com/certificate/abcd1234efgh')?.value, 'ABCD1234EFGH');
      expect(parseOpenable('ABCD 1234 EFGH')?.kind, 'ticket');
      expect(parseOpenable('abc'), isNull);
      expect(parseOpenable(''), isNull);
    });
  });
}
