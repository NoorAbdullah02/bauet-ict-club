import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/i18n.dart';
import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/form_widgets.dart';
import 'contests_screen.dart';
import 'event_detail_screen.dart' show PageTopBar;

String _day(dynamic d) => d == null ? '' : d.toString().split('T').first;

class _Member {
  final name = TextEditingController();
  final email = TextEditingController();
  final sid = TextEditingController();
  void dispose() {
    name.dispose();
    email.dispose();
    sid.dispose();
  }
}

/// One contest: details, results and the team sign-up form.
class ContestDetailScreen extends StatefulWidget {
  const ContestDetailScreen({super.key, required this.id});
  final int id;

  @override
  State<ContestDetailScreen> createState() => _ContestDetailScreenState();
}

class _ContestDetailScreenState extends State<ContestDetailScreen> {
  late final AppState _state = context.read<AppState>();
  Map<String, dynamic>? _c;
  Map<String, dynamic>? _info;
  bool _loading = true;
  bool _busy = false;
  String? _error;
  Map<String, dynamic>? _done;
  final _team = TextEditingController();
  final _leader = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final List<_Member> _members = [_Member()];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_team, _leader, _email, _phone]) {
      c.dispose();
    }
    for (final m in _members) {
      m.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final c = await _state.api.adminCall('GET', '/contests/${widget.id}', query: {'_': DateTime.now().millisecondsSinceEpoch});
      final i = await _state.api.adminCall('GET', '/contest-teams/public/${widget.id}', query: {'_': DateTime.now().millisecondsSinceEpoch});
      if (mounted) {
        setState(() {
          _c = c is Map ? Map<String, dynamic>.from(c) : null;
          _info = i is Map ? Map<String, dynamic>.from(i) : null;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      final r = await _state.api.adminCall('POST', '/contest-teams/${widget.id}', data: {
        'team_name': _team.text.trim(),
        'leader_name': _leader.text.trim(),
        'email': _email.text.trim(),
        'phone': _phone.text.trim(),
        'members': [for (final m in _members) {'name': m.name.text.trim(), 'email': m.email.text.trim(), 'student_id': m.sid.text.trim()}],
      });
      if (mounted) setState(() => _done = r is Map ? Map<String, dynamic>.from(r) : {});
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final c = _c;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: ListView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
            children: [
              PageTopBar(title: c?['title']?.toString() ?? 'Contest', fallback: '/contests'),
              const SizedBox(height: 16),
              if (_loading)
                const ShimmerList(count: 3, height: 100)
              else if (_error != null || c == null)
                ErrorState(message: _error ?? 'This contest does not exist. It may have been removed.', onRetry: _load)
              else ..._body(context, p, c),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _body(BuildContext context, Pal p, Map<String, dynamic> c) {
    final st = contestStatus(c);
    final open = _info != null ? _info!['open'] == true : st == 'open';
    final max = (c['team_max'] as num?)?.toInt() ?? 4;
    final min = (c['team_min'] as num?)?.toInt() ?? 1;
    final results = _info?['results'] is List ? (_info!['results'] as List).whereType<Map>().toList() : <Map>[];
    return [
      Tag(st, color: st == 'open' ? const Color(0xFF10B981) : p.muted),
      const SizedBox(height: 8),
      Text('${c['title']}', style: displayStyle(context, 30)),
      const SizedBox(height: 10),
      if (_day(c['start_date']).isNotEmpty) _line(Icons.calendar_month_rounded, fmtDate(DateTime.tryParse(_day(c['start_date'])))),
      if ('${c['location'] ?? ''}'.isNotEmpty) _line(Icons.place_rounded, '${c['location']}'),
      _line(Icons.groups_rounded, 'Teams of ${min == max ? max : '$min to $max'}${_info != null ? ' · ${_info!['teams']} joined' : ''}'),
      if ('${c['description'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 14), child: Text('${c['description']}', style: bodyStyle(context, color: p.muted))),
      if ('${c['prize'] ?? ''}'.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 14),
          child: GlassCard(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              const Icon(Icons.emoji_events_rounded, color: Color(0xFFF59E0B)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('PRIZES', style: monoStyle(context, size: 10)), Text('${c['prize']}', style: bodyStyle(context, weight: FontWeight.w600))])),
            ]),
          ),
        ),
      if ('${c['rules'] ?? ''}'.isNotEmpty) ...[
        const SizedBox(height: 18),
        Text('Rules', style: displayStyle(context, 20)),
        const SizedBox(height: 6),
        for (final r in '${c['rules']}'.split('\n').where((x) => x.trim().isNotEmpty)) Padding(padding: const EdgeInsets.only(bottom: 3), child: Text('•  $r', style: bodyStyle(context, size: 13.5, color: p.muted))),
      ],
      if (results.isNotEmpty) ...[
        const SizedBox(height: 22),
        Text('Results', style: displayStyle(context, 22)),
        const SizedBox(height: 8),
        for (final t in results)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GlassCard(
              padding: const EdgeInsets.all(12),
              child: Row(children: [
                CircleAvatar(radius: 17, backgroundColor: (t['rank'] as num) <= 3 ? const Color(0xFFFBBF24) : p.alt, child: Text('${t['rank']}', style: bodyStyle(context, weight: FontWeight.w800, color: Colors.black87))),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${t['team_name']}', style: bodyStyle(context, weight: FontWeight.w700)), if ('${t['prize_note'] ?? ''}'.isNotEmpty) Text('${t['prize_note']}', style: bodyStyle(context, size: 12, color: p.muted))])),
              ]),
            ),
          ),
      ],
      const SizedBox(height: 22),
      Text('Sign your team up', style: displayStyle(context, 22)),
      const SizedBox(height: 10),
      GlassCard(
        padding: const EdgeInsets.all(16),
        child: _done != null
            ? Column(children: [
                const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 44),
                const SizedBox(height: 8),
                Text("You are in, ${_done!['team_name']}!", textAlign: TextAlign.center, style: displayStyle(context, 20)),
                Text('Your team of ${_done!['size']} is signed up. We will contact the team leader by e-mail.', textAlign: TextAlign.center, style: bodyStyle(context, size: 13, color: p.muted)),
              ])
            : !open
                ? Text(st == 'finished' ? 'This contest is over.' : 'Sign-up for this contest is closed.', style: bodyStyle(context, color: p.muted))
                : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    AppField(controller: _team, label: 'Team name *', icon: Icons.groups_rounded),
                    const SizedBox(height: 10),
                    AppField(controller: _leader, label: "Team leader's name *", icon: Icons.person_outline_rounded),
                    const SizedBox(height: 10),
                    AppField(controller: _email, label: "Leader's e-mail *", icon: Icons.mail_outline_rounded, keyboard: TextInputType.emailAddress),
                    const SizedBox(height: 10),
                    AppField(controller: _phone, label: "Leader's phone (optional)", icon: Icons.phone_outlined, keyboard: TextInputType.phone),
                    const SizedBox(height: 14),
                    Text('OTHER MEMBERS (${1 + _members.length} OF $max)', style: monoStyle(context)),
                    for (var i = 0; i < _members.length; i++) ...[
                      const SizedBox(height: 10),
                      Row(children: [
                        Expanded(child: Text('Member ${i + 1}', style: bodyStyle(context, weight: FontWeight.w700))),
                        IconButton(
                          tooltip: 'Remove member',
                          onPressed: () => setState(() => _members.removeAt(i).dispose()),
                          icon: const Icon(Icons.close_rounded, size: 20),
                        ),
                      ]),
                      AppField(controller: _members[i].name, label: 'Name', icon: Icons.person_outline_rounded),
                      const SizedBox(height: 8),
                      AppField(controller: _members[i].email, label: 'E-mail (for points)', icon: Icons.mail_outline_rounded, keyboard: TextInputType.emailAddress),
                      const SizedBox(height: 8),
                      AppField(controller: _members[i].sid, label: 'Student ID', icon: Icons.badge_outlined),
                    ],
                    if (1 + _members.length < max) TextButton.icon(onPressed: () => setState(() => _members.add(_Member())), icon: const Icon(Icons.add_rounded), label: Text(tr('Add a member'))),
                    const SizedBox(height: 10),
                    GradientButton(label: 'Sign up', icon: Icons.how_to_reg_rounded, loading: _busy, onPressed: _submit),
                  ]),
      ),
    ];
  }

  Widget _line(IconData i, String t) => Padding(
        padding: const EdgeInsets.only(top: 3),
        child: Row(children: [Icon(i, size: 16, color: context.pal.tech), const SizedBox(width: 8), Expanded(child: Text(t, style: bodyStyle(context, size: 13.5, color: context.pal.muted)))]),
      );
}
