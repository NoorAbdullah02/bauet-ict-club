import 'package:flutter/material.dart';

import '../../widgets/common.dart';
import '../event_detail_screen.dart';
import 'admin_widgets.dart';

/// Shared frame of the simple admin pages: aurora background, back button, title, pull-to-refresh list.
class AdminPage extends StatelessWidget {
  const AdminPage({super.key, required this.title, required this.children, this.onRefresh, this.actions});
  final String title;
  final List<Widget> children;
  final Future<void> Function()? onRefresh;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    final list = ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
      children: [
        PageTopBar(
          title: title,
          fallback: '/admin',
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [...?actions, const AdminThemeButton()]),
        ),
        const SizedBox(height: 16),
        ...children,
      ],
    );
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(child: onRefresh == null ? list : RefreshIndicator(onRefresh: onRefresh!, child: list)),
      ),
    );
  }
}
