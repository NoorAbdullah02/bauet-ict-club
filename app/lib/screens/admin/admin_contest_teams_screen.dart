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

  Future<void> _editTeam(Map t) async {
    final name = TextEditingController(text: '${t['team_name']}');
    final leader = TextEditingController(text: '${t['leader_name']}');
    final email = TextEditingController(text: '${t['email']}');
    final phone = TextEditingController(text: '${t['phone'] ?? ''}');
    final members = TextEditingController(
        text: (t['members'] is List ? (t['members'] as List).whereType<Map>() : <Map>[]).map((m) => [m['name'], m['email'], m['student_id']].where((x) => x != null && '$x'.isNotEmpty).join(', ')).join('\n'));
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Edit team', style: displayStyle(ctx, 24)),
            const SizedBox(height: 14),
            AppField(controller: name, label: 'Team name', icon: Icons.groups_rounded),
            const SizedBox(height: 10),
            AppField(controller: leader, label: "Leader's name", icon: Icons.person_outline_rounded),
            const SizedBox(height: 10),
            AppField(controller: email, label: "Leader's e-mail", icon: Icons.mail_outline_rounded, keyboard: TextInputType.emailAddress),
            const SizedBox(height: 10),
            AppField(controller: phone, label: 'Phone', icon: Icons.phone_outlined, keyboard: TextInputType.phone),
            const SizedBox(height: 10),
            AppField(controller: members, label: 'Members, one per line: name, e-mail, student ID', icon: Icons.group_add_outlined, maxLines: 5, keyboard: TextInputType.multiline),
            const SizedBox(height: 14),
            GradientButton(label: 'Save', icon: Icons.save_rounded, onPressed: () => Navigator.pop(ctx, true)),
          ]),
        ),
      ),
    );
    if (ok == true) {
      final list = members.text.split('\n').map((l) => l.trim()).where((l) => l.isNotEmpty).map((l) {
        final p = l.split(',').map((x) => x.trim()).toList();
        return {'name': p.isNotEmpty ? p[0] : '', 'email': p.length > 1 ? p[1] : '', 'student_id': p.length > 2 ? p[2] : ''};
      }).toList();
      await _patch((t['id'] as num).toInt(), {'team_name': name.text.trim(), 'leader_name': leader.text.trim(), 'email': email.text.trim(), 'phone': phone.text.trim(), 'members': list});
    }
    for (final c in [name, leader, email, phone, members]) {
      c.dispose();
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
                      IconButton(tooltip: 'Edit team', onPressed: () => _editTeam(t), icon: Icon(Icons.edit_outlined, color: p.accent)),
                      IconButton(tooltip: 'Remove team', onPressed: () => _remove(t), icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444))),
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
