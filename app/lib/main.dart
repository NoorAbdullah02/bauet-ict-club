import 'dart:ui' show PointerDeviceKind;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/config.dart';
import 'core/crash.dart';
import 'core/push.dart';
import 'core/update_check.dart';
import 'core/router.dart';
import 'core/theme.dart';
import 'data/api.dart';
import 'state/app_state.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  Crash.start(); // crash reports; never blocks or breaks the start
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
  final state = AppState(api: Api());
  await state.init();
  runApp(ChangeNotifierProvider<AppState>.value(value: state, child: const ClubApp()));
}

class ClubApp extends StatefulWidget {
  const ClubApp({super.key});

  @override
  State<ClubApp> createState() => _ClubAppState();
}

/// Lists scroll by dragging with a mouse or trackpad too (emulators and desktop browsers), not only by touch.
class _AppScroll extends MaterialScrollBehavior {
  const _AppScroll();
  @override
  Set<PointerDeviceKind> get dragDevices => {PointerDeviceKind.touch, PointerDeviceKind.mouse, PointerDeviceKind.stylus, PointerDeviceKind.trackpad};
}

class _ClubAppState extends State<ClubApp> {
  late final GoRouter _router;
  final GlobalKey<ScaffoldMessengerState> _messenger = GlobalKey<ScaffoldMessengerState>();

  @override
  void initState() {
    super.initState();
    _router = buildRouter(context.read<AppState>());
    Push.start(context.read<AppState>(), _router); // not awaited: the app never waits for notifications
    UpdateCheck.run(context.read<AppState>().api, _messenger); // asks the website if a newer app exists
  }

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mode = context.select<AppState, ThemeMode>((s) => s.themeMode);
    final lang = context.select<AppState, String>((s) => s.lang);
    return MaterialApp.router(
      title: AppConfig.clubName,
      debugShowCheckedModeBanner: false,
      scrollBehavior: const _AppScroll(),
      themeMode: mode,
      theme: buildTheme(Pal.lightPal),
      darkTheme: buildTheme(Pal.darkPal),
      scaffoldMessengerKey: _messenger,
      routerConfig: _router,
      builder: (context, child) {
        final dark = Theme.of(context).brightness == Brightness.dark;
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: (dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark).copyWith(
            statusBarColor: Colors.transparent,
            systemNavigationBarColor: Colors.transparent,
          ),
          child: KeyedSubtree(key: ValueKey(lang), child: child ?? const SizedBox.shrink()),
        );
      },
    );
  }
}
