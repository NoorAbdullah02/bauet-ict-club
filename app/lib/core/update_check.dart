import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/api.dart';
import 'config.dart';
import 'i18n.dart';

/// The build number of this app: set by the GitHub build (`--dart-define=APP_BUILD=<run number>`). 0 = a local build: no update check.
const int kAppBuild = int.fromEnvironment('APP_BUILD', defaultValue: 0);

/// "Is there a newer app?" The app is installed from the website (not the Play Store), so it asks the website itself:
/// `/downloads/version.json` = { "build": 112, "min": 100, "name": "1.0.0", "notes": "what is new" }.
/// - build: the newest published build; an older app is offered the update and may say "Later".
/// - min: the oldest build still allowed; an older app must update (no "Later").
class UpdateCheck {
  /// Waits a little (the app is still opening), asks the website and, if needed, shows a banner at the top.
  static Future<void> run(Api api, GlobalKey<ScaffoldMessengerState> messenger) async {
    if (kAppBuild <= 0) return;
    try {
      await Future<void>.delayed(const Duration(seconds: 6));
      final info = await api.latestVersion();
      final latest = _i(info['build']);
      final min = _i(info['min']);
      if (latest <= kAppBuild) return;
      final forced = min > kAppBuild;
      final prefs = await SharedPreferences.getInstance();
      if (!forced && prefs.getInt('update_later') == latest) return; // the person said "Later" for this version
      final state = messenger.currentState;
      if (state == null) return;
      final notes = '${info['notes'] ?? ''}'.trim();
      final name = '${info['name'] ?? ''}'.trim();
      state.showMaterialBanner(
        MaterialBanner(
          leading: const Icon(Icons.system_update_rounded),
          content: Text(
            [
              forced ? tr('Please update the app to keep using it.') : tr('A new version of the app is available.'),
              if (name.isNotEmpty) '$name (build $latest)',
              if (notes.isNotEmpty) notes,
            ].join('\n'),
          ),
          actions: [
            if (!forced)
              TextButton(
                onPressed: () {
                  prefs.setInt('update_later', latest);
                  state.hideCurrentMaterialBanner();
                },
                child: Text(tr('Later')),
              ),
            FilledButton(
              onPressed: () => launchUrl(Uri.parse('${AppConfig.origin}/app'), mode: LaunchMode.externalApplication),
              child: Text(tr('Update')),
            ),
          ],
        ),
      );
    } catch (_) {
      // no network or no version file: nothing to say
    }
  }

  static int _i(Object? v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
}
