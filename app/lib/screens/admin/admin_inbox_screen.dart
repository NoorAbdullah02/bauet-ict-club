import '../../core/i18n.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import 'admin_page.dart';
import 'admin_widgets.dart';

/// Contact-form inbox: read, mark as read, reply by email, delete.
class AdminInboxScreen extends StatefulWidget {
  const AdminInboxScreen({super.key});

  @override
  State<AdminInboxScreen> createState() => _AdminInboxScreenState();
}

class _AdminInboxScreenState extends State<AdminInboxScreen> {
  late final AppState _state = context.read<AppState>();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String? _error;
  bool _unreadOnly = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final r = await _state.api.adminList('/messages');
      if (mounted) setState(() => _rows = r);
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _read(Map<String, dynamic> m, bool read) async {
    try {
      await _state.api.adminCall('PUT', '/messages/${m['id']}', data: {'is_read': read});
      setState(() => m['is_read'] = read);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _delete(Map<String, dynamic> m) async {
    if (!await confirmAction(context, title: 'Delete this message?', message: 'It goes to the Trash.', confirmText: 'Delete', danger: true)) return;
    try {
      await _state.api.adminCall('DELETE', '/messages/${m['id']}');
      setState(() => _rows.remove(m));
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final shown = _rows.where((m) => !_unreadOnly || m['is_read'] != true).toList();
    final unread = _rows.where((m) => m['is_read'] != true).length;
    return AdminPage(
      title: 'Inbox',
      onRefresh: _load,
      children: [
        Row(children: [
          PillChip(label: 'All (${_rows.length})', selected: !_unreadOnly, onTap: () => setState(() => _unreadOnly = false)),
          const SizedBox(width: 10),
          PillChip(label: 'Unread ($unread)', selected: _unreadOnly, onTap: () => setState(() => _unreadOnly = true)),
        ]),
        const SizedBox(height: 14),
        if (_loading)
          const ShimmerList(count: 3, height: 110)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else if (shown.isEmpty)
          const EmptyState(icon: Icons.mark_email_read_outlined, title: 'Inbox is empty', message: 'Messages from the contact form show up here.')
        else
          for (final m in shown)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassCard(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    if (m['is_read'] != true) Container(width: 9, height: 9, margin: const EdgeInsets.only(right: 8), decoration: BoxDecoration(color: p.tech, shape: BoxShape.circle)),
                    Expanded(child: Text('${m['name'] ?? 'Someone'}', style: bodyStyle(context, weight: FontWeight.w700, size: 15.5))),
                    Text('${m['created_at'] ?? ''}'.split('T').first, style: monoStyle(context, size: 10.5, color: p.muted)),
                  ]),
                  if ('${m['subject'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text('${m['subject']}', style: bodyStyle(context, weight: FontWeight.w600))),
                  const SizedBox(height: 6),
                  SelectableText('${m['message'] ?? ''}', style: bodyStyle(context, size: 14, color: p.muted)),
                  const SizedBox(height: 8),
                  Text('${m['email'] ?? ''}', style: monoStyle(context, size: 11, color: p.accent)),
                  Wrap(spacing: 6, children: [
                    TextButton.icon(
                      onPressed: () {
                        final subject = Uri.encodeComponent('Re: ${m['subject'] ?? 'Your message to BAUET ICT Club'}');
                        openUrl(context, 'mailto:${m['email']}?subject=$subject');
                        _read(m, true);
                      },
                      icon: const Icon(Icons.reply_rounded, size: 16),
                      label: const Text('Reply'),
                    ),
                    TextButton.icon(onPressed: () => _read(m, m['is_read'] != true), icon: Icon(m['is_read'] == true ? Icons.mark_email_unread_outlined : Icons.done_all_rounded, size: 16), label: Text(m['is_read'] == true ? 'Mark unread' : 'Mark read')),
                    TextButton.icon(onPressed: () => _delete(m), icon: const Icon(Icons.delete_outline_rounded, size: 16), label: Text(tr('Delete'))),
                  ]),
                ]),
              ),
            ),
      ],
    );
  }
}
