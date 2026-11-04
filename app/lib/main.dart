import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/config.dart';
import 'core/router.dart';
import 'core/theme.dart';
import 'data/api.dart';
import 'state/app_state.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
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

class _ClubAppState extends State<ClubApp> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = buildRouter(context.read<AppState>());
  }

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mode = context.select<AppState, ThemeMode>((s) => s.themeMode);
    return MaterialApp.router(
      title: AppConfig.clubName,
      debugShowCheckedModeBanner: false,
      themeMode: mode,
      theme: buildTheme(Pal.lightPal),
      darkTheme: buildTheme(Pal.darkPal),
      routerConfig: _router,
      builder: (context, child) {
        final dark = Theme.of(context).brightness == Brightness.dark;
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: (dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark).copyWith(
            statusBarColor: Colors.transparent,
            systemNavigationBarColor: Colors.transparent,
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
