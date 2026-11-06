import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_page.dart';

/// The teams of one contest: contact details, give places, publish the results (which also gives points).
class AdminContestTeamsScreen extends StatefulWidget {
  const AdminContestTeamsScreen({super.key, required this.id});
  final int id;

  @override
  State<AdminContestTeamsScreen> createState() => _AdminContestTeamsScreenState();
}

class _AdminContestTeamsScreenState extends State<AdminContestTeamsScreen> {
  late final AppState _state = context.read<AppState>();
  Map<String, dynamic>? _d;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final d = await _state.api.adminCall('GET', '/contest-teams/admin/${widget.id}', query: {'_': DateTime.now().millisecondsSinceEpoch});
      if (mounted) setState(() => _d = d is Map ? Map<String, dynamic>.from(d) : null);
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _patch(int teamId, Map<String, dynamic> body) async {
    try {
      await _state.api.adminCall('PATCH', '/contest-teams/admin/team/$teamId', data: body);
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _remove(Map t) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove this team?'),
        content: Text('"${t['team_name']}" will be removed from the list.'),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remove'))],
      ),
    );
    if (yes != true) return;
    try {
      await _state.api.adminCall('DELETE', '/contest-teams/admin/team/${t['id']}');
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _publish() async {
    final pp = _d?['prize_points'] is Map ? _d!['prize_points'] as Map : {};
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Publish the results?'),
        content: Text('Everyone can then see the places. Points go to every team member: 1st ${pp['1']}, 2nd ${pp['2']}, 3rd ${pp['3']}, others ${_d?['participation_points']}.'),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Publish and give points'))],
      ),
    );
    if (yes != true) return;
    setState(() => _busy = true);
    try {
      final r = await _state.api.adminCall('POST', '/contest-teams/admin/${widget.id}/publish');
      if (mounted) showSnack(context, 'Results published. ${r is Map ? r['awards_given'] : 0} point awards given.');
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _hide() async {
    try {
      await _state.api.adminCall('POST', '/contest-teams/admin/${widget.id}/unpublish');
      if (mounted) showSnack(context, 'Results hidden');
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final teams = _d?['teams'] is List ? (_d!['teams'] as List).whereType<Map>().toList() : <Map>[];
    final published = (_d?['contest'] as Map?)?['results_published'] == true;
    return AdminPage(
      title: 'Teams: ${(_d?['contest'] as Map?)?['title'] ?? ''}',
      onRefresh: _load,
      children: [
        if (_loading)
          const ShimmerList(count: 3, height: 120)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else ...[
          if (published)
            GhostButton(label: 'Hide the results', icon: Icons.visibility_off_rounded, onPressed: _hide)
          else
            GradientButton(label: 'Publish results', icon: Icons.campaign_rounded, loading: _busy, onPressed: _publish),
          const SizedBox(height: 8),
          Text(published ? 'The results are public. You can still change places and publish again.' : 'Type each team\'s place (1, 2, 3 …), then publish. Points go to every team member who gave an e-mail.', style: bodyStyle(context, size: 12.5, color: p.muted)),
          const SizedBox(height: 14),
          if (teams.isEmpty)
            const EmptyState(icon: Icons.groups_outlined, title: 'No team yet', message: 'Teams show up here when they sign up.')
          else
            for (final t in teams)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassCard(
                  padding: const EdgeInsets.all(14),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text('${t['team_name']}', style: bodyStyle(context, weight: FontWeight.w700, size: 16))),
                      IconButton(onPressed: () => _remove(t), icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444))),
                    ]),
                    Text('${t['leader_name']} · ${t['email']}${'${t['phone'] ?? ''}'.isNotEmpty ? ' · ${t['phone']}' : ''}', style: bodyStyle(context, size: 12.5, color: p.muted)),
                    if (t['members'] is List && (t['members'] as List).isNotEmpty) Text((t['members'] as List).whereType<Map>().map((m) => '${m['name']}').join(', '), style: bodyStyle(context, size: 12.5, color: p.muted)),
                    const SizedBox(height: 10),
                    _PlaceBox(key: ValueKey('${t['id']}-${t['rank']}'), initial: '${t['rank'] ?? ''}', onSave: (v) => _patch((t['id'] as num).toInt(), {'rank': v})),
                  ]),
                ),
              ),
        ],
      ],
    );
  }
}

class _PlaceBox extends StatefulWidget {
  const _PlaceBox({super.key, required this.initial, required this.onSave});
  final String initial;
  final ValueChanged<String> onSave;

  @override
  State<_PlaceBox> createState() => _PlaceBoxState();
}

class _PlaceBoxState extends State<_PlaceBox> {
  late final _c = TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(child: AppField(controller: _c, label: 'Place (1, 2, 3 …)', icon: Icons.emoji_events_outlined, keyboard: TextInputType.number)),
      const SizedBox(width: 10),
      FilledButton(onPressed: () => widget.onSave(_c.text.trim()), child: const Text('Save')),
    ]);
  }
}
