import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../state/app_state.dart';

/// Light/dark toggle for the admin area (independent from the public theme).
class AdminThemeButton extends StatelessWidget {
  const AdminThemeButton({super.key});

  @override
  Widget build(BuildContext context) {
    final dark = context.select<AppState, bool>((s) => s.adminDark);
    return IconButton(
      tooltip: 'Toggle admin theme',
      onPressed: () {
        HapticFeedback.selectionClick();
        context.read<AppState>().toggleAdminTheme();
      },
      icon: Icon(dark ? Icons.light_mode_rounded : Icons.dark_mode_rounded),
    );
  }
}
