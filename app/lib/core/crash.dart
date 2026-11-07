import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';

/// Firebase is started once, by whichever feature needs it first (crash reports, notifications).
Future<void> ensureFirebase() async {
  if (Firebase.apps.isEmpty) await Firebase.initializeApp();
}

/// Crash reports (Firebase Crashlytics, free): when the app breaks on a phone, the club sees where and on which phones in the Firebase console.
/// Nothing here can make the app fail: if Firebase is not available the errors are simply printed as before.
class Crash {
  static bool _ready = false;

  static void start() {
    if (kIsWeb) return;
    final previous = FlutterError.onError;
    FlutterError.onError = (details) {
      previous?.call(details);
      if (_ready) FirebaseCrashlytics.instance.recordFlutterFatalError(details);
    };
    final previousAsync = PlatformDispatcher.instance.onError;
    PlatformDispatcher.instance.onError = (error, stack) {
      if (_ready) FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return previousAsync?.call(error, stack) ?? true;
    };
    _init();
  }

  static Future<void> _init() async {
    try {
      await ensureFirebase();
      await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(!kDebugMode);
      _ready = true;
    } catch (e) {
      debugPrint('Crash reports are not available: $e');
    }
  }
}
