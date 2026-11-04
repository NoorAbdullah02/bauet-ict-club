import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../widgets/coder.dart';
import '../widgets/common.dart';

class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key, required this.path});
  final String path;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TerminalState(
                  title: '404',
                  command: 'cd $path',
                  lines: const ['error: no such route', '// the page you want is not in this build'],
                  isError: true,
                  onRetry: () => context.go('/home'),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
