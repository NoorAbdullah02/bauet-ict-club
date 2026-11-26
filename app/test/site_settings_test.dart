import 'package:bauet_ict_club/models/models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('an edited page text comes through from the settings row', () {
    final s = SiteSettings.fromJson({
      'galleryTitle': 'Gallery — edited by admin',
      'contactTitle': 'Contact us — hand click',
      'socialLinks': {'email': 'club@example.com'},
    });

    expect(s.pageText('galleryTitle', 'Gallery'), 'Gallery — edited by admin');
    expect(s.pageText('contactTitle', 'Contact us'), 'Contact us — hand click');
    expect(s.pageText('galleryTag', 'Moments'), 'Moments'); // untouched keys keep the app's own wording
    expect(s.email, 'club@example.com');
  });

  test('every page-heading key the website can edit is read', () {
    final s = SiteSettings.fromJson({for (final k in SiteSettings.pageKeys) k: 'value of $k'});

    for (final k in SiteSettings.pageKeys) {
      expect(s.pageText(k, 'fallback'), 'value of $k', reason: k);
    }
  });

  test('a blank or whitespace-only page text falls back to the built-in wording', () {
    final s = SiteSettings.fromJson({'aboutTitle': '', 'galleryTag': '   ', 'contactTag': 42});

    expect(s.pageText('aboutTitle', 'About the club'), 'About the club');
    expect(s.pageText('galleryTag', 'Moments'), 'Moments');
    expect(s.pageText('contactTag', 'Say hello'), 'Say hello');
    expect(const SiteSettings().pageText('joinTitle', 'Join the club'), 'Join the club');
  });
}
