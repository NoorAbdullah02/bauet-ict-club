import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../models/models.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_widgets.dart';

Color _statusColor(String s) {
  switch (s) {
    case 'approved':
      return const Color(0xFF34D399);
    case 'rejected':
      return const Color(0xFFEF4444);
    default:
      return const Color(0xFFFFC857);
  }
}

class AdminApplicationsScreen extends StatefulWidget {
  const AdminApplicationsScreen({super.key});

  @override
  State<AdminApplicationsScreen> createState() => _AdminApplicationsScreenState();
}

class _AdminApplicationsScreenState extends State<AdminApplicationsScreen> {
  List<Registration> _all = [];
  bool _loading = true;
  String? _error;
  String _type = 'committee';
  String _status = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  late final AppState _state = context.read<AppState>();

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await _state.api.list('registrations', fresh: true);
      if (!mounted) return;
      setState(() => _all = rows.map(Registration.fromJson).toList());
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _run(Future<void> Function() fn, String ok) async {
    try {
      await fn();
      if (mounted) showSnack(context, ok);
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _setStatus(Registration r, String status) async {
    await _run(() async {
      await _state.api.setRegistrationStatus(r.id, status);
      if (mounted) setState(() => r.status = status);
    }, '${r.fullName} marked $status');
  }

  Future<void> _delete(Registration r) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete application?'),
        content: Text('${r.fullName}\'s application will be removed permanently.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: Color(0xFFEF4444)))),
        ],
      ),
    );
    if (yes != true) return;
    try {
      await _state.api.deleteRegistration(r.id);
      if (!mounted) return;
      setState(() => _all.remove(r));
      showUndoSnack(context, 'Moved to Trash', () async {
        try {
          await _state.api.restoreTrash('registrations', r.id);
          await _load();
        } on ApiException catch (e) {
          if (mounted) showSnack(context, e.message, error: true);
        }
      });
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _select(Registration r) async {
    var sessions = _state.members.map((m) => m.session).where((s) => s.isNotEmpty).toSet().toList();
    try {
      final rows = await _state.api.committees();
      final labels = rows.map((c) => (c['label'] ?? '').toString()).where((s) => s.isNotEmpty).toList();
      if (labels.isNotEmpty) sessions = labels;
    } on ApiException catch (_) {
      // fall back to sessions known from the public members list
    }
    sessions.sort((a, b) => sessionRank(b).compareTo(sessionRank(a)));
    if (!mounted) return;
    final result = await showModalBottomSheet<(String, String)>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _SelectSheet(reg: r, sessions: sessions),
    );
    final isAmb = r.type == 'ambassador';
    if (result == null) return;
    await _run(() async {
      await _state.api.selectRegistration(r.id, result.$1, result.$2, (isAmb ? 50 : (kCommitteePosts.indexOf(result.$2) + 1).clamp(1, 999)).toInt());
      if (mounted) setState(() => r.status = 'approved');
      await _state.reloadMembers();
    }, '${r.fullName} added to ${result.$1} as ${result.$2}');
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final list = _all.where((r) => r.type == _type && (_status == 'all' || r.status == _status)).toList();
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Row(children: [
                IconButton(onPressed: () => context.canPop() ? context.pop() : context.go('/admin'), icon: const Icon(Icons.arrow_back_rounded)),
                Expanded(child: Text('Applications', style: displayStyle(context, 24))),
                const AdminThemeButton(),
                IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              child: Row(children: [
                Expanded(child: _TypeTab(label: 'Committee', count: _all.where((r) => r.type == 'committee').length, selected: _type == 'committee', color: p.accent, onTap: () => setState(() => _type = 'committee'))),
                const SizedBox(width: 8),
                Expanded(child: _TypeTab(label: 'Ambassador', count: _all.where((r) => r.type == 'ambassador').length, selected: _type == 'ambassador', color: p.tech, onTap: () => setState(() => _type = 'ambassador'))),
                const SizedBox(width: 8),
                Expanded(child: _TypeTab(label: 'General', count: _all.where((r) => r.type == 'general').length, selected: _type == 'general', color: p.third, onTap: () => setState(() => _type = 'general'))),
              ]),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 40,
              child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 20), children: [
                for (final s in const ['all', 'pending', 'approved', 'rejected'])
                  Padding(padding: const EdgeInsets.only(right: 8), child: PillChip(label: s[0].toUpperCase() + s.substring(1), selected: _status == s, onTap: () => setState(() => _status = s))),
              ]),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _load,
                color: p.tech,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 40),
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    if (_loading)
                      const ShimmerList(count: 3, height: 170)
                    else if (_error != null)
                      ErrorState(message: _error!, onRetry: _load)
                    else if (list.isEmpty)
                      const EmptyState(icon: Icons.inbox_rounded, title: 'No applications')
                    else
                      for (var i = 0; i < list.length; i++)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: _AppCard(
                            reg: list[i],
                            onStatus: (s) => _setStatus(list[i], s),
                            onDelete: () => _delete(list[i]),
                            onSelect: () => _select(list[i]),
                          ).stagger(i),
                        ),
                  ],
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

class _TypeTab extends StatelessWidget {
  const _TypeTab({required this.label, required this.count, required this.selected, required this.color, required this.onTap});
  final String label;
  final int count;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: selected ? color.withValues(alpha: 0.18) : Colors.transparent,
          border: Border.all(color: selected ? color : p.line),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Flexible(child: Text(label, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12.5, weight: FontWeight.w700, color: selected ? p.fg : p.muted))),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(99), color: color.withValues(alpha: 0.25)),
            child: Text('$count', style: monoStyle(context, size: 10.5, color: p.fg, weight: FontWeight.w700)),
          ),
        ]),
      ),
    );
  }
}

class _AppCard extends StatelessWidget {
  const _AppCard({required this.reg, required this.onStatus, required this.onDelete, required this.onSelect});
  final Registration reg;
  final ValueChanged<String> onStatus;
  final VoidCallback onDelete;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final r = reg;
    final canSelect = r.type != 'general';
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ClipRRect(borderRadius: BorderRadius.circular(16), child: SizedBox(width: 64, height: 64, child: NetImage(r.photoUrl, fallbackLabel: r.fullName))),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(r.fullName, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w800, size: 16))),
                Tag(r.status, color: _statusColor(r.status)),
              ]),
              const SizedBox(height: 3),
              Text('ID ${r.studentId} · ${r.department} · Batch ${r.batch}', style: bodyStyle(context, size: 12.5, color: p.muted)),
              if (r.type != 'general' && r.post.isNotEmpty) ...[const SizedBox(height: 6), Text(r.post, style: bodyStyle(context, size: 13, color: p.accent, weight: FontWeight.w700))],
            ]),
          ),
        ]),
        const SizedBox(height: 12),
        _Line(Icons.call_outlined, r.phone, onTap: () => openUrl(context, 'tel:${r.phone}')),
        _Line(Icons.mail_outline_rounded, r.email, onTap: () => openUrl(context, 'mailto:${r.email}')),
        if (r.gender.isNotEmpty) _Line(Icons.person_outline_rounded, r.gender),
        if (r.type == 'general' && r.interests.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Wrap(spacing: 6, runSpacing: 6, children: [for (final i in r.interests) Tag(i, color: p.third)]),
          ),
        if (r.type == 'general' && r.experience.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text('Level: ${r.experience}', style: bodyStyle(context, size: 12.5, color: p.muted))),
        if (r.note.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(r.note, style: bodyStyle(context, size: 13, color: p.muted))),
        if (r.createdAt != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text('APPLIED ${fmtDate(r.createdAt)}'.toUpperCase(), style: monoStyle(context, size: 9.5))),
        const SizedBox(height: 12),
        Divider(color: p.line, height: 1),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          if (canSelect) FilledButton.icon(onPressed: onSelect, icon: const Icon(Icons.how_to_reg_rounded, size: 18), label: const Text('Select for team'), style: FilledButton.styleFrom(backgroundColor: p.accent, foregroundColor: Colors.white)),
          if (r.status != 'approved') OutlinedButton.icon(onPressed: () => onStatus('approved'), icon: const Icon(Icons.check_rounded, size: 18), label: const Text('Approve'), style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF34D399))),
          if (r.status != 'rejected') OutlinedButton.icon(onPressed: () => onStatus('rejected'), icon: const Icon(Icons.close_rounded, size: 18), label: const Text('Reject'), style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFFFA04D))),
          IconButton(onPressed: onDelete, tooltip: 'Delete', icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444))),
        ]),
      ]),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line(this.icon, this.text, {this.onTap});
  final IconData icon;
  final String text;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();
    final p = context.pal;
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(children: [
          Icon(icon, size: 16, color: p.tech),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: bodyStyle(context, size: 13.5))),
        ]),
      ),
    );
  }
}

/// Bottom sheet: choose committee session + post, returns (session, post).
class _SelectSheet extends StatefulWidget {
  const _SelectSheet({required this.reg, required this.sessions});
  final Registration reg;
  final List<String> sessions;

  @override
  State<_SelectSheet> createState() => _SelectSheetState();
}

class _SelectSheetState extends State<_SelectSheet> {
  late final TextEditingController _session = TextEditingController(text: widget.sessions.isEmpty ? '' : widget.sessions.first);
  bool get _amb => widget.reg.type == 'ambassador';
  late String _post = _amb ? kAmbassadorPost : (kCommitteePosts.contains(widget.reg.post) ? widget.reg.post : kCommitteePosts.first);
  String? _error;

  @override
  void dispose() {
    _session.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Padding(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Select for team', style: displayStyle(context, 26)),
          const SizedBox(height: 4),
          Text(_amb ? 'Add ${widget.reg.fullName} to the Ambassadors page.' : 'Add ${widget.reg.fullName} to the Team page.', style: bodyStyle(context, color: p.muted, size: 13.5)),
          const SizedBox(height: 18),
          AppField(controller: _session, label: 'Committee session (e.g. Summer 2026)', error: _error, icon: Icons.calendar_today_rounded, onChanged: () => setState(() => _error = null)),
          if (widget.sessions.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final s in widget.sessions) PillChip(label: s, selected: _session.text == s, onTap: () => setState(() => _session.text = s)),
            ]),
          ],
          const SizedBox(height: 14),
          if (_amb)
            Tag(kAmbassadorPost, color: p.tech)
          else
            PickerField(label: 'Position', value: _post, options: kCommitteePosts, icon: Icons.workspace_premium_outlined, onChanged: (v) => setState(() => _post = v)),
          const SizedBox(height: 20),
          GradientButton(
            label: 'Add to team',
            icon: Icons.how_to_reg_rounded,
            onPressed: () {
              final s = _session.text.trim();
              if (s.isEmpty) {
                setState(() => _error = 'Session is required');
                return;
              }
              Navigator.pop(context, (s, _post));
            },
          ),
        ]),
      ),
    );
  }
}
