import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../models/models.dart';
import '../../state/app_state.dart';
import '../../widgets/charts.dart';
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
  final Set<int> _sel = {}; // applications ticked for bulk actions
  bool _bulkBusy = false;

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

  /// Approve / reject always asks first (yes or no).
  Future<void> _confirmStatus(Registration r, String status) async {
    final approve = status == 'approved';
    final yes = await confirmAction(
      context,
      title: '${approve ? 'Approve' : 'Reject'} ${r.fullName}?',
      message: approve ? 'Their application will be marked as approved.' : 'They will receive a polite email saying the application was not accepted.',
      confirmText: approve ? 'Yes, approve' : 'Yes, reject',
      danger: !approve,
    );
    if (yes) await _setStatus(r, status);
  }

  /// Run one action over every ticked application after a yes/no popup.
  Future<void> _bulk(String kind, List<Registration> picked) async {
    final targets = kind == 'approve'
        ? picked.where((r) => r.type == 'general' && r.status != 'approved').toList()
        : kind == 'reject'
            ? picked.where((r) => r.status != 'rejected').toList()
            : picked;
    if (targets.isEmpty) {
      showSnack(context, 'Nothing to change in the selected applications');
      return;
    }
    final n = targets.length;
    final yes = await confirmAction(
      context,
      title: '${kind == 'approve' ? 'Approve' : kind == 'reject' ? 'Reject' : 'Move to Trash:'} $n application${n == 1 ? '' : 's'}?',
      message: kind == 'reject' ? 'Each applicant gets a polite rejection email.' : kind == 'trash' ? 'You can restore them from the Trash for 30 days.' : 'They will be marked as approved.',
      confirmText: kind == 'approve' ? 'Yes, approve $n' : kind == 'reject' ? 'Yes, reject $n' : 'Trash $n',
      danger: kind != 'approve',
    );
    if (!yes) return;
    setState(() => _bulkBusy = true);
    var ok = 0;
    for (final r in targets) {
      try {
        if (kind == 'trash') {
          await _state.api.deleteRegistration(r.id);
          _all.remove(r);
        } else {
          final st = kind == 'approve' ? 'approved' : 'rejected';
          await _state.api.setRegistrationStatus(r.id, st);
          r.status = st;
        }
        ok += 1;
      } on ApiException catch (e) {
        await _state.handleAuthError(e);
      }
    }
    if (!mounted) return;
    setState(() {
      _bulkBusy = false;
      _sel.clear();
    });
    showSnack(context, '$ok of $n ${kind == 'trash' ? 'moved to Trash' : kind == 'approve' ? 'approved' : 'rejected'}', error: ok != n);
  }

  /// Email the PDF or Word export (current filter, or only the ticked ones) to the admin address.
  Future<void> _emailExport(String format, {List<int> ids = const []}) async {
    await _run(() async {
      await _state.api.emailApplicationsExport({'format': format, 'type': _type, 'status': _status, if (ids.isNotEmpty) 'ids': ids});
    }, 'Export emailed to the admin address');
  }

  /// Everything about one applicant in a sheet, with the same actions as the card.
  Future<void> _details(Registration r) async {
    final action = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => _DetailsSheet(reg: r),
    );
    if (action == null || !mounted) return;
    if (action == 'select') await _select(r);
    if (action == 'post') await _changePost(r);
    if (action == 'approve') await _confirmStatus(r, 'approved');
    if (action == 'reject') await _confirmStatus(r, 'rejected');
    if (action == 'delete') await _delete(r);
  }

  /// Move a committee applicant to a different post (they can still be selected for another one later).
  Future<void> _changePost(Registration r) async {
    final next = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _PostSheet(current: r.post),
    );
    if (next == null || next == r.post || !mounted) return;
    final yes = await confirmAction(context, title: 'Change post for ${r.fullName}?', message: 'From ${r.post.isEmpty ? 'no post' : r.post} to $next.', confirmText: 'Yes, change');
    if (!yes) return;
    await _run(() async {
      await _state.api.setRegistrationPost(r.id, next);
      await _load();
    }, 'Post changed to $next');
  }

  Future<void> _delete(Registration r) async {
    final yes = await confirmAction(context, title: 'Delete ${r.fullName}\'s application?', message: 'It will be moved to the Trash. You can restore it for 30 days.', confirmText: 'Move to Trash', danger: true);
    if (!yes) return;
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
    if (!mounted) return;
    final yes = await confirmAction(
      context,
      title: 'Select ${r.fullName}?',
      message: 'They will be published on the ${isAmb ? 'Ambassadors' : 'Team'} page as ${result.$2} for ${result.$1}, and get a congratulations email.',
      confirmText: 'Yes, select',
    );
    if (!yes) return;
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
                PopupMenuButton<String>(
                  tooltip: 'Email export',
                  icon: const Icon(Icons.forward_to_inbox_rounded),
                  onSelected: (v) => _emailExport(v),
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'pdf', child: Text('Email PDF of this list')),
                    PopupMenuItem(value: 'docx', child: Text('Email Word of this list')),
                  ],
                ),
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
            if (!_loading && _error == null && _all.any((r) => r.type == _type))
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: _Insights(rows: _all.where((r) => r.type == _type).toList()),
              ),
            const SizedBox(height: 12),
            SizedBox(
              height: 40,
              child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 20), children: [
                for (final s in const ['all', 'pending', 'approved', 'rejected'])
                  Padding(padding: const EdgeInsets.only(right: 8), child: PillChip(label: s[0].toUpperCase() + s.substring(1), selected: _status == s, onTap: () => setState(() => _status = s))),
              ]),
            ),
            if (list.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                child: _BulkBar(
                  total: list.length,
                  picked: list.where((r) => _sel.contains(r.id)).length,
                  busy: _bulkBusy,
                  isGeneral: _type == 'general',
                  onAll: (all) => setState(() {
                    if (all) {
                      _sel.addAll(list.map((r) => r.id));
                    } else {
                      _sel.removeAll(list.map((r) => r.id));
                    }
                  }),
                  onApprove: () => _bulk('approve', list.where((r) => _sel.contains(r.id)).toList()),
                  onReject: () => _bulk('reject', list.where((r) => _sel.contains(r.id)).toList()),
                  onTrash: () => _bulk('trash', list.where((r) => _sel.contains(r.id)).toList()),
                  onPdf: () => _emailExport('pdf', ids: list.where((r) => _sel.contains(r.id)).map((r) => r.id).toList()),
                  onWord: () => _emailExport('docx', ids: list.where((r) => _sel.contains(r.id)).map((r) => r.id).toList()),
                ),
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
                            selected: _sel.contains(list[i].id),
                            onToggle: () => setState(() {
                              final id = list[i].id;
                              if (!_sel.remove(id)) _sel.add(id);
                            }),
                            onOpen: () => _details(list[i]),
                            onStatus: (s) => _confirmStatus(list[i], s),
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
  const _AppCard({required this.reg, required this.selected, required this.onToggle, required this.onOpen, required this.onStatus, required this.onDelete, required this.onSelect});
  final Registration reg;
  final bool selected;
  final VoidCallback onToggle;
  final VoidCallback onOpen;
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
          GestureDetector(onTap: onOpen, child: ClipRRect(borderRadius: BorderRadius.circular(16), child: SizedBox(width: 64, height: 64, child: NetImage(r.photoUrl, fallbackLabel: r.fullName)))),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: GestureDetector(onTap: onOpen, child: Text(r.fullName, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w800, size: 16)))),
                Tag(r.status, color: _statusColor(r.status)),
                SizedBox(width: 32, height: 24, child: Checkbox(value: selected, onChanged: (_) => onToggle(), visualDensity: VisualDensity.compact)),
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
        const SizedBox(height: 8),
        GestureDetector(onTap: onOpen, child: Text('View all details', style: bodyStyle(context, size: 12.5, color: p.tech, weight: FontWeight.w700))),
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


/// Select-all / bulk action bar above the list.
class _BulkBar extends StatelessWidget {
  const _BulkBar({required this.total, required this.picked, required this.busy, required this.isGeneral, required this.onAll, required this.onApprove, required this.onReject, required this.onTrash, required this.onPdf, required this.onWord});
  final int total;
  final int picked;
  final bool busy;
  final bool isGeneral;
  final ValueChanged<bool> onAll;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback onTrash;
  final VoidCallback onPdf;
  final VoidCallback onWord;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Checkbox(value: picked == total && total > 0, tristate: false, onChanged: (v) => onAll(v == true)),
          Expanded(child: Text(picked == 0 ? 'Select all ($total)' : '$picked selected', style: bodyStyle(context, weight: FontWeight.w700, size: 13.5))),
          if (busy) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
        ]),
        if (picked > 0)
          Wrap(spacing: 8, runSpacing: 6, children: [
            if (isGeneral) OutlinedButton.icon(onPressed: busy ? null : onApprove, icon: const Icon(Icons.check_rounded, size: 16), label: const Text('Approve'), style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF34D399))),
            OutlinedButton.icon(onPressed: busy ? null : onReject, icon: const Icon(Icons.close_rounded, size: 16), label: const Text('Reject'), style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFFFA04D))),
            OutlinedButton.icon(onPressed: busy ? null : onTrash, icon: const Icon(Icons.delete_outline_rounded, size: 16), label: const Text('Trash'), style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFEF4444))),
            OutlinedButton.icon(onPressed: busy ? null : onPdf, icon: const Icon(Icons.picture_as_pdf_outlined, size: 16), label: const Text('Email PDF'), style: OutlinedButton.styleFrom(foregroundColor: p.tech)),
            OutlinedButton.icon(onPressed: busy ? null : onWord, icon: const Icon(Icons.description_outlined, size: 16), label: const Text('Email Word'), style: OutlinedButton.styleFrom(foregroundColor: p.tech)),
          ]),
      ]),
    );
  }
}

/// Full details of one applicant. Pops with the chosen action: select, approve, reject or delete.
class _DetailsSheet extends StatelessWidget {
  const _DetailsSheet({required this.reg});
  final Registration reg;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final r = reg;
    Widget tile(IconData icon, String label, String value, {VoidCallback? onTap}) {
      if (value.trim().isEmpty) return const SizedBox.shrink();
      return GestureDetector(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: p.line)),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, size: 18, color: p.accent),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label.toUpperCase(), style: monoStyle(context, size: 9.5)),
                const SizedBox(height: 2),
                Text(value, style: bodyStyle(context, size: 14, weight: FontWeight.w600, color: onTap != null ? p.tech : null)),
              ]),
            ),
          ]),
        ),
      );
    }

    final typeName = r.type == 'committee' ? 'Committee applicant' : r.type == 'ambassador' ? 'Department ambassador' : 'General member';
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Row(children: [
            ClipRRect(borderRadius: BorderRadius.circular(22), child: SizedBox(width: 96, height: 96, child: NetImage(r.photoUrl, fallbackLabel: r.fullName))),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(typeName.toUpperCase(), style: monoStyle(context, size: 10, color: p.tech)),
                const SizedBox(height: 4),
                Text(r.fullName, style: displayStyle(context, 24)),
                const SizedBox(height: 6),
                Tag(r.status, color: _statusColor(r.status)),
              ]),
            ),
          ]),
          const SizedBox(height: 16),
          tile(Icons.workspace_premium_outlined, 'Post applied for', r.type == 'committee' ? r.post : ''),
          tile(Icons.badge_outlined, 'Student ID', r.studentId),
          tile(Icons.apartment_rounded, 'Department', r.department),
          tile(Icons.school_outlined, 'Batch', r.batch),
          tile(Icons.person_outline_rounded, 'Gender', r.gender),
          tile(Icons.call_outlined, 'Phone', r.phone, onTap: () => openUrl(context, 'tel:${r.phone}')),
          tile(Icons.mail_outline_rounded, 'Email', r.email, onTap: () => openUrl(context, 'mailto:${r.email}')),
          tile(Icons.auto_awesome_outlined, 'Interests', r.interests.join(', ')),
          tile(Icons.work_outline_rounded, 'Experience', r.experience),
          tile(Icons.sticky_note_2_outlined, 'Note from the applicant', r.note),
          tile(Icons.event_outlined, 'Applied on', r.createdAt == null ? '' : fmtDate(r.createdAt)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            if (r.type == 'committee') OutlinedButton.icon(onPressed: () => Navigator.pop(context, 'post'), icon: const Icon(Icons.swap_horiz_rounded, size: 18), label: const Text('Change post')),
            if (r.type != 'general') FilledButton.icon(onPressed: () => Navigator.pop(context, 'select'), icon: const Icon(Icons.how_to_reg_rounded, size: 18), label: const Text('Select for team'))
            else if (r.status != 'approved') FilledButton.icon(onPressed: () => Navigator.pop(context, 'approve'), icon: const Icon(Icons.check_rounded, size: 18), label: const Text('Approve'), style: FilledButton.styleFrom(backgroundColor: const Color(0xFF34D399), foregroundColor: Colors.black)),
            if (r.status != 'rejected') OutlinedButton.icon(onPressed: () => Navigator.pop(context, 'reject'), icon: const Icon(Icons.close_rounded, size: 18), label: const Text('Reject'), style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFFFA04D))),
            OutlinedButton.icon(onPressed: () => Navigator.pop(context, 'delete'), icon: const Icon(Icons.delete_outline_rounded, size: 18), label: const Text('Trash'), style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFEF4444))),
          ]),
        ]),
      ),
    );
  }
}


/// Bottom sheet: pick the post an applicant should hold instead of the one they asked for.
class _PostSheet extends StatefulWidget {
  const _PostSheet({required this.current});
  final String current;

  @override
  State<_PostSheet> createState() => _PostSheetState();
}

class _PostSheetState extends State<_PostSheet> {
  late String _post = kCommitteePosts.contains(widget.current) ? widget.current : kCommitteePosts.first;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Padding(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Change post', style: displayStyle(context, 26)),
        const SizedBox(height: 4),
        Text('Applied for: ${widget.current.isEmpty ? 'no post' : widget.current}', style: bodyStyle(context, color: p.muted, size: 13.5)),
        const SizedBox(height: 16),
        PickerField(label: 'New post', value: _post, options: kCommitteePosts, icon: Icons.workspace_premium_outlined, onChanged: (v) => setState(() => _post = v)),
        const SizedBox(height: 20),
        GradientButton(label: 'Save post', icon: Icons.check_rounded, onPressed: () => Navigator.pop(context, _post)),
      ]),
    );
  }
}


/// Charts for the applications in the current tab: status ring, departments and batches.
class _Insights extends StatefulWidget {
  const _Insights({required this.rows});
  final List<Registration> rows;

  @override
  State<_Insights> createState() => _InsightsState();
}

class _InsightsState extends State<_Insights> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final rows = widget.rows;
    int n(String s) => rows.where((r) => r.status == s).length;
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      onTap: () => setState(() => _open = !_open),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text('INSIGHTS · ${rows.length} APPLICANTS', style: monoStyle(context, size: 10.5, color: p.tech))),
          Text(_open ? 'Hide' : 'Show charts', style: bodyStyle(context, size: 12, color: p.tech, weight: FontWeight.w700)),
        ]),
        if (_open) ...[
          const SizedBox(height: 14),
          Center(
            child: DonutChart(slices: [
              ChartSlice('Pending', n('pending'), const Color(0xFFF5A524)),
              ChartSlice('Approved', n('approved'), const Color(0xFF18A957)),
              ChartSlice('Rejected', n('rejected'), const Color(0xFFEF6B8A)),
            ]),
          ),
          const SizedBox(height: 16),
          Text('BY DEPARTMENT', style: monoStyle(context, size: 10)),
          const SizedBox(height: 6),
          BarList(items: tallySlices<Registration>(rows, (r) => r.department, take: 6), color: const Color(0xFF1F4FD8)),
          const SizedBox(height: 12),
          Text('BY BATCH', style: monoStyle(context, size: 10)),
          const SizedBox(height: 6),
          BarList(items: tallySlices<Registration>(rows, (r) => r.batch.isEmpty ? '' : '${r.batch}th', take: 6), color: const Color(0xFF17A2D8)),
        ],
      ]),
    );
  }
}
