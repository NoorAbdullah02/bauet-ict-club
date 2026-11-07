import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import '../state/app_state.dart';
import 'crash.dart';

/// Phone notifications through Firebase Cloud Messaging (free): "New event: ...", "New notice: ...".
/// The phone sends its notification address (token) to the club server; the server sends the news to it.
/// Anything that goes wrong here is swallowed: the app works the same without notifications.
class Push {
  static String? _token;

  static Future<void> start(AppState state, GoRouter router) async {
    if (kIsWeb) return; // notifications are for the phone app
    try {
      await ensureFirebase();
      final messaging = FirebaseMessaging.instance;
      if (state.pushOn) await _register(state);
      // the classic registration token is what the server's FCM HTTP v1 call expects
      // ignore: deprecated_member_use
      messaging.onTokenRefresh.listen((t) {
        _token = t;
        if (state.pushOn) state.api.registerPush(t, state.lang, state.pushTopics.toList()).catchError((_) {});
      });
      // app open: just refresh the lists so the new event shows at once
      FirebaseMessaging.onMessage.listen((_) => state.loadAll(fresh: true));
      // tapped a notification: open the page it is about
      FirebaseMessaging.onMessageOpenedApp.listen((m) => _open(router, m));
      final first = await messaging.getInitialMessage();
      if (first != null) _open(router, first);
    } catch (e) {
      debugPrint('Notifications are not available: $e');
    }
  }

  /// The switch in the side menu.
  static Future<void> setEnabled(AppState state, bool on) async {
    state.setPush(on);
    try {
      if (on) {
        await _register(state);
      } else if (_token != null) {
        await state.api.unregisterPush(_token!);
      }
    } catch (e) {
      debugPrint('Notification switch failed: $e');
    }
  }

  /// The person changed a topic or the language: tell the server (only when notifications are on).
  static Future<void> refresh(AppState state) async {
    if (!state.pushOn || _token == null) return;
    try {
      await state.api.registerPush(_token!, state.lang, state.pushTopics.toList());
    } catch (e) {
      debugPrint('Could not save the notification topics: $e');
    }
  }

  static Future<void> _register(AppState state) async {
    final messaging = FirebaseMessaging.instance;
    final permission = await messaging.requestPermission(); // Android 13+ asks the person once
    if (permission.authorizationStatus == AuthorizationStatus.denied) return;
    // ignore: deprecated_member_use
    final token = await messaging.getToken();
    if (token == null || token.isEmpty) return;
    _token = token;
    await state.api.registerPush(token, state.lang, state.pushTopics.toList());
  }

  static void _open(GoRouter router, RemoteMessage m) {
    final path = m.data['path'];
    if (path is String && path.startsWith('/')) router.go(path);
  }
}
