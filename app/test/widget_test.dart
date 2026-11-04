import 'package:bauet_ict_club/core/config.dart';
import 'package:bauet_ict_club/core/theme.dart';
import 'package:bauet_ict_club/core/utils.dart';
import 'package:bauet_ict_club/models/models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('validators (mirror the website)', () {
    test('Bangladeshi mobile numbers', () {
      expect(validBdPhone('01712345678'), isTrue);
      expect(validBdPhone('+8801712345678'), isTrue);
      expect(validBdPhone('017 1234-5678'), isTrue);
      expect(validBdPhone('01212345678'), isFalse);
      expect(validBdPhone('1712345678'), isFalse);
    });

    test('email, batch and name', () {
      expect(validEmail('a@b.co'), isTrue);
      expect(validEmail('nope'), isFalse);
      expect(validBatch('14'), isTrue);
      expect(validBatch('1a'), isFalse);
      expect(validName('Abdul Karim'), isTrue);
      expect(validName('1'), isFalse);
    });
  });

  group('team helpers', () {
    test('session ranking puts newest first', () {
      final list = ['Summer 2025', 'Winter 2025', 'Summer 2026']..sort((a, b) => sessionRank(b).compareTo(sessionRank(a)));
      expect(list, ['Summer 2026', 'Winter 2025', 'Summer 2025']);
    });

    test('member grouping by position', () {
      Member m(String pos) => Member.fromJson({'id': 1, 'name': 'X', 'position': pos});
      expect(m('President').isLeader, isTrue);
      expect(m('Vice President (Technical)').isLeader, isTrue);
      expect(m('Treasurer').isCore, isTrue);
      expect(m('Chief Executive (Media)').isChief, isTrue);
      expect(m('Executive Member (Logistics)').isExecutive, isTrue);
    });
  });

  group('models and config', () {
    test('registration parses interests list', () {
      final r = Registration.fromJson({'id': 3, 'type': 'general', 'full_name': 'A B', 'interests': ['AI & ML'], 'status': null});
      expect(r.interests, ['AI & ML']);
      expect(r.status, 'pending');
    });

    test('relative image paths resolve against the server origin', () {
      expect(AppConfig.resolve('https://x.y/a.png'), 'https://x.y/a.png');
      expect(AppConfig.resolve('/uploads/a.png'), startsWith(AppConfig.origin));
      expect(AppConfig.resolve(null), '');
    });

    test('palettes use the club colours', () {
      expect(Pal.darkPal.bg.toARGB32(), 0xFF0E1231);
      expect(Pal.lightPal.bg.toARGB32(), 0xFFF2F1FF);
    });
  });
}
