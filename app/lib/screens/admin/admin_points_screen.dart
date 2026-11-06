import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_page.dart';

/// Points: who has how many, and a form to give (or take back) extra points.
class AdminPointsScreen extends StatefulWidget {
  const AdminPointsScreen({super.key});

  @override
  State<AdminPointsScreen> createState() => _AdminPointsScreenState();
}

class _AdminPointsScreenState extends State<AdminPointsScreen> {
  late final AppState _state = context.read<AppState>();
  final _email = TextEditingController();
  final _name = TextEditingController();
  final _points = TextEditingController(text: '10');
  final _reason = TextEditingController();
  Map<String, dynamic>? _d;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _email.dispose();
    _name.dispose();
    _points.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final d = await _state.api.adminCall('GET', '/points/admin', query: {'_': DateTime.now().millisecondsSinceEpoch});
      if (mounted) setState(() => _d = d is Map ? Map<String, dynamic>.from(d) : null);
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _give() async {
    setState(() => _busy = true);
    try {
      await _state.api.adminCall('POST', '/points/award', data: {'email': _email.text.trim(), 'name': _name.text.trim(), 'points': int.tryParse(_points.text.trim()) ?? 0, 'reason': _reason.text.trim()});
      if (!mounted) return;
      showSnack(context, 'Points saved');
      _email.clear();
      _name.clear();
      _reason.clear();
      _points.text = '10';
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _editAward(Map a) async {
    final pts = TextEditingController(text: '${a['points']}');
    final reason = TextEditingController(text: '${a['reason']}');
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Edit award', style: displayStyle(ctx, 24)),
          const SizedBox(height: 14),
          AppField(controller: pts, label: 'Points', icon: Icons.add_circle_outline_rounded, keyboard: const TextInputType.numberWithOptions(signed: true)),
          const SizedBox(height: 10),
          AppField(controller: reason, label: 'Reason', icon: Icons.notes_rounded),
          const SizedBox(height: 14),
          GradientButton(label: 'Save', icon: Icons.save_rounded, onPressed: () => Navigator.pop(ctx, true)),
        ]),
      ),
    );
    if (ok == true) {
      try {
        await _state.api.adminCall('PUT', '/points/award/${a['id']}', data: {'points': int.tryParse(pts.text.trim()) ?? 0, 'reason': reason.text.trim()});
        if (mounted) showSnack(context, 'Award corrected');
        await _load();
      } on ApiException catch (e) {
        if (!mounted) return;
        await _state.handleAuthError(e);
        if (mounted) showSnack(context, e.message, error: true);
      }
    }
    pts.dispose();
    reason.dispose();
  }

  Future<void> _undo(int id) async {
    try {
      await _state.api.adminCall('DELETE', '/points/award/$id');
      if (mounted) showSnack(context, 'Award removed');
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final people = _d?['people'] is List ? (_d!['people'] as List).whereType<Map>().toList() : <Map>[];
    final awards = _d?['awards'] is List ? (_d!['awards'] as List).whereType<Map>().toList() : <Map>[];
    return AdminPage(
      title: 'Points and badges',
      onRefresh: _load,
      children: [
        GlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Give extra points', style: bodyStyle(context, weight: FontWeight.w700)),
            Text('Each event a person is checked in at gives ${_d?['per_event'] ?? 10} points. Use this for helping out or winning.', style: bodyStyle(context, size: 12.5, color: p.muted)),
            const SizedBox(height: 12),
            AppField(controller: _email, label: "Person's e-mail", icon: Icons.mail_outline_rounded, keyboard: TextInputType.emailAddress),
            const SizedBox(height: 10),
            AppField(controller: _name, label: 'Name (optional)', icon: Icons.person_outline_rounded),
            const SizedBox(height: 10),
            AppField(controller: _points, label: 'Points', icon: Icons.add_circle_outline_rounded, keyboard: const TextInputType.numberWithOptions(signed: true)),
            const SizedBox(height: 10),
            AppField(controller: _reason, label: 'Reason (e.g. ran the desk)', icon: Icons.notes_rounded),
            const SizedBox(height: 12),
            GradientButton(label: 'Give points', icon: Icons.emoji_events_rounded, loading: _busy, onPressed: _give),
          ]),
        ),
        const SizedBox(height: 18),
        if (_loading)
          const ShimmerList(count: 3, height: 70)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else ...[
          Text('LEADERBOARD (${people.length})', style: monoStyle(context)),
          const SizedBox(height: 10),
          if (people.isEmpty)
            const EmptyState(icon: Icons.emoji_events_outlined, title: 'Nobody has points yet', message: 'People get points when they are checked in at an event.')
          else
            for (final x in people.take(50))
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: GlassCard(
                  padding: const EdgeInsets.all(12),
                  child: Row(children: [
                    SizedBox(width: 34, child: Text('#${x['rank']}', style: bodyStyle(context, color: p.muted, weight: FontWeight.w700))),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${x['full_name'] ?? x['name']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700)),
                        Text('${x['email']} · ${x['events']} events${(x['bonus'] ?? 0) != 0 ? ' · ${x['bonus']} bonus' : ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12, color: p.muted)),
                      ]),
                    ),
                    Text('${x['points']}', style: displayStyle(context, 22, color: p.accent)),
                  ]),
                ),
              ),
          const SizedBox(height: 18),
          Text('EXTRA POINTS GIVEN', style: monoStyle(context)),
          const SizedBox(height: 10),
          if (awards.isEmpty)
            Text('No extra points yet.', style: bodyStyle(context, color: p.muted))
          else
            for (final a in awards)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: GlassCard(
                  padding: const EdgeInsets.fromLTRB(14, 8, 4, 8),
                  child: Row(children: [
                    SizedBox(
                      width: 52,
                      child: Text('${(a['points'] as num) > 0 ? '+' : ''}${a['points']}', style: displayStyle(context, 20, color: (a['points'] as num) > 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444))),
                    ),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${a['reason']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w600)),
                        Text('${a['name'] ?? a['email']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12, color: p.muted)),
                      ]),
                    ),
                    IconButton(tooltip: 'Edit award', onPressed: () => _editAward(a), icon: Icon(Icons.edit_outlined, color: p.accent)),
                    IconButton(tooltip: 'Remove award', onPressed: () => _undo((a['id'] as num).toInt()), icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444))),
                  ]),
                ),
              ),
        ],
      ],
    );
  }
}
