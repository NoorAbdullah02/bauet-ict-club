import 'dart:async';

import 'package:flutter/material.dart';
import '../../core/i18n.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_widgets.dart';

class AdminCommitteesScreen extends StatefulWidget {
  const AdminCommitteesScreen({super.key});

  @override
  State<AdminCommitteesScreen> createState() => _AdminCommitteesScreenState();
}

class _AdminCommitteesScreenState extends State<AdminCommitteesScreen> {
  late final AppState _state = context.read<AppState>();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await _state.api.committees();
      rows.sort((a, b) => sessionRank('${b['label']}').compareTo(sessionRank('${a['label']}')));
      if (mounted) setState(() => _rows = rows);
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// "1 Oct 2026 – 31 Mar 2027 · 129 days left" (or "term finished") from the server's term object.
  static String _termLine(dynamic raw) {
    final t = Map<String, dynamic>.from(raw as Map);
    String d(String? iso) {
      final v = DateTime.tryParse(iso ?? '');
      if (v == null) return '—';
      const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${v.day} ${m[v.month - 1]} ${v.year}';
    }

    final left = (t['days_left'] as num?)?.toInt() ?? 0;
    final tail = t['expired'] == true ? 'term finished' : '$left day${left == 1 ? '' : 's'} left';
    return '${d(t['start'] as String?)} – ${d(t['end'] as String?)} · $tail';
  }

  /// Mark a committee as the running one (the same call the website's Committees card makes).
  Future<void> _setCurrent(Map<String, dynamic> row) async {
    final label = '${row['label']}';
    try {
      await _state.api.setCurrentCommittee(label);
      if (mounted) showSnack(context, '$label is now the current committee');
      await _load();
      await _state.loadAll();
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _edit(Map<String, dynamic> row) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _EditSheet(row: row),
    );
    if (ok == true) {
      if (mounted) showSnack(context, 'Committee updated');
      await _load();
      await _state.loadAll();
    }
  }

  Future<void> _launch() async {
    final labels = _rows.map((r) => '${r['label']}').toList();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _LaunchSheet(sessions: labels),
    );
    if (ok == true) {
      if (mounted) showSnack(context, 'Committee launched');
      await _load();
      await _state.reloadMembers();
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _launch,
        backgroundColor: p.accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.rocket_launch_rounded),
        label: const Text('Launch new committee'),
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(children: [
                IconButton(tooltip: tr('Back'), onPressed: () => context.canPop() ? context.pop() : context.go('/admin'), icon: const Icon(Icons.arrow_back_rounded)),
                Expanded(child: Text('Committees', style: displayStyle(context, 24))),
                const AdminThemeButton(),
              ]),
            ),
            Expanded(
              child: RefreshIndicator(
                color: p.tech,
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 110),
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    if (_loading)
                      const ShimmerList(count: 3, height: 80)
                    else if (_error != null)
                      ErrorState(message: _error!, onRetry: _load)
                    else if (_rows.isEmpty)
                      const EmptyState(icon: Icons.groups_outlined, title: 'No committees yet')
                    else
                      for (var i = 0; i < _rows.length; i++)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: GlassCard(
                            padding: const EdgeInsets.all(16),
                            child: Row(children: [
                              Icon(Icons.groups_rounded, color: p.accent),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(_rows[i]['label'].toString(), style: bodyStyle(context, weight: FontWeight.w700, size: 16)),
                                  if (_rows[i]['term'] is Map) ...[
                                    const SizedBox(height: 2),
                                    Text(_termLine(_rows[i]['term']), style: monoStyle(context, size: 10)),
                                  ],
                                ]),
                              ),
                              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                Row(mainAxisSize: MainAxisSize.min, children: [
                                  if (_rows[i]['is_current'] == true) ...[
                                    const Tag('Current', color: Color(0xFF34D399)),
                                    const SizedBox(width: 4),
                                  ],
                                  PopupMenuButton<String>(
                                    tooltip: 'Committee actions',
                                    padding: EdgeInsets.zero,
                                    icon: const Icon(Icons.more_vert_rounded, size: 20),
                                    onSelected: (v) => v == 'edit' ? _edit(_rows[i]) : _setCurrent(_rows[i]),
                                    itemBuilder: (_) => [
                                      const PopupMenuItem(value: 'edit', child: Text('Edit committee')),
                                      if (_rows[i]['is_current'] != true) const PopupMenuItem(value: 'current', child: Text('Set as current')),
                                    ],
                                  ),
                                ]),
                                Text('${_rows[i]['members']} members', style: monoStyle(context, size: 10.5)),
                              ]),
                            ]),
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

class _LaunchSheet extends StatefulWidget {
  const _LaunchSheet({required this.sessions});
  final List<String> sessions;

  @override
  State<_LaunchSheet> createState() => _LaunchSheetState();
}

/// The launch form. The server's plan decides the dates and whether the running committee makes this an early
/// handover, so the app can never disagree with the website.
class _LaunchSheetState extends State<_LaunchSheet> {
  final _name = TextEditingController();
  final _startCtl = TextEditingController();
  final _endCtl = TextEditingController();
  late String _copyFrom = widget.sessions.isEmpty ? '' : widget.sessions.first;
  String _scope = 'none';
  String? _error;
  Map<String, dynamic> _plan = const {};
  Timer? _timer;
  bool _checking = false;
  bool _busy = false;
  bool _blocked = false; // an early handover: one confirmation
  bool _editedDates = false; // the admin typed dates: the server keeps them

  static const _scopes = {
    'none': 'Empty committee',
    'leaders': 'Copy leaders only',
    'all': 'Copy everyone',
  };

  static const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  static String _fmt(String? iso) {
    final d = DateTime.tryParse(iso ?? '');
    if (d == null) return '—';
    return '${d.day} ${_months[d.month - 1]} ${d.year}';
  }

  /// Winter 2026 → Summer 2027, Summer 2026 → Winter 2026: the semester that follows the newest committee.
  String _suggested() {
    final label = widget.sessions.isEmpty ? '' : widget.sessions.first;
    final year = int.tryParse((RegExp(r'(20\d{2})').firstMatch(label)?.group(1)) ?? '') ?? DateTime.now().year;
    if (RegExp(r'winter', caseSensitive: false).hasMatch(label)) return 'Summer ${year + 1}';
    if (RegExp(r'summer', caseSensitive: false).hasMatch(label)) return 'Winter $year';
    return '';
  }

  @override
  void initState() {
    super.initState();
    _name.text = _suggested();
    _name.addListener(_queuePlan);
    _queuePlan();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _name.dispose();
    _startCtl.dispose();
    _endCtl.dispose();
    super.dispose();
  }

  void _queuePlan() {
    _timer?.cancel();
    if (!mounted) return;
    setState(() {
      _error = null;
      _blocked = false;
    });
    if (_name.text.trim().length < 3) {
      setState(() => _plan = const {});
      return;
    }
    _timer = Timer(const Duration(milliseconds: 350), _askPlan);
  }

  Future<void> _askPlan() async {
    final name = _name.text.trim();
    if (name.length < 3 || !mounted) return;
    final state = context.read<AppState>();
    setState(() => _checking = true);
    try {
      final plan = await state.api.committeePlan(
        session: name,
        start: _editedDates ? _startCtl.text : null,
        end: _editedDates ? _endCtl.text : null,
      );
      if (!mounted) return;
      final term = plan['term'];
      setState(() {
        _plan = plan;
        if (term is Map && !_editedDates) {
          _startCtl.text = term['start']?.toString() ?? '';
          _endCtl.text = term['end']?.toString() ?? '';
        }
      });
    } on ApiException catch (e) {
      await state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Future<void> _pickDate(bool first) async {
    final t = DateTime.tryParse(first ? _startCtl.text : _endCtl.text) ?? DateTime.now();
    final d = await showDatePicker(context: context, initialDate: t, firstDate: DateTime(2015), lastDate: DateTime(2100));
    if (d == null || !mounted) return;
    String two(int v) => v.toString().padLeft(2, '0');
    setState(() {
      _editedDates = true;
      if (first) {
        _startCtl.text = '${d.year}-${two(d.month)}-${two(d.day)}';
      } else {
        _endCtl.text = '${d.year}-${two(d.month)}-${two(d.day)}';
      }
    });
    await _askPlan();
  }

  Future<void> _go({bool force = false}) async {
    final name = _name.text.trim();
    if (name.length < 3) {
      setState(() => _error = 'Give the committee a name of at least 3 letters');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _blocked = false;
    });
    final state = context.read<AppState>();
    try {
      await state.api.launchCommittee(name, _scope == 'none' ? null : _copyFrom, _scope, force: force, start: _startCtl.text, end: _endCtl.text);
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      await state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
      // only an early handover asks for this (a name that already exists is a plain error)
      if (mounted && !force && e.needsConfirm) setState(() => _blocked = true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? get _planError => _error ?? (_plan['exists'] == true ? '${_name.text.trim()} already exists — pick another name.' : null);

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final term = _plan['term'] is Map ? Map<String, dynamic>.from(_plan['term'] as Map) : const <String, dynamic>{};
    final early = _plan['needs_confirm'] == true;
    final canLaunch = _name.text.trim().length >= 3 && _planError == null;
    return Padding(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Launch new committee', style: displayStyle(context, 26)),
          const SizedBox(height: 4),
          Text('Any name works. A semester name (Winter 2027) brings its own six months; your own name starts today.', style: bodyStyle(context, color: p.muted, size: 13.5)),
          const SizedBox(height: 18),
          AppField(controller: _name, label: 'Committee name', error: _planError, icon: Icons.calendar_today_rounded, maxLength: 50),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: GestureDetector(onTap: _busy ? null : () => _pickDate(true), child: AbsorbPointer(child: AppField(controller: _startCtl, label: 'First day', icon: Icons.event_rounded)))),
            const SizedBox(width: 12),
            Expanded(child: GestureDetector(onTap: _busy ? null : () => _pickDate(false), child: AbsorbPointer(child: AppField(controller: _endCtl, label: 'Last day', icon: Icons.event_available_rounded)))),
          ]),
          if (term.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(children: [
              Icon(_checking ? Icons.hourglass_top_rounded : Icons.verified_rounded, size: 14, color: p.tech),
              const SizedBox(width: 6),
              Expanded(child: Text('${_fmt(term['start']?.toString())} – ${_fmt(term['end']?.toString())} · ${term['months'] ?? 6} months', style: monoStyle(context, size: 10.5))),
            ]),
          ],
          if (early) ...[
            const SizedBox(height: 10),
            Text('The running committee still has time left, so this is an early handover: the server asks for one confirmation.', style: bodyStyle(context, color: p.muted, size: 12.5)),
          ],
          const SizedBox(height: 14),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final e in _scopes.entries) PillChip(label: e.value, selected: _scope == e.key, onTap: () => setState(() => _scope = e.key)),
          ]),
          if (_scope != 'none' && widget.sessions.isNotEmpty) ...[
            const SizedBox(height: 14),
            PickerField(label: 'Copy from', value: _copyFrom, options: widget.sessions, icon: Icons.copy_rounded, onChanged: (v) => setState(() => _copyFrom = v)),
          ],
          if (_blocked) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _busy ? null : () => _go(force: true),
              icon: const Icon(Icons.swap_horiz_rounded, size: 18),
              label: const Text('Confirm the early handover'),
            ),
            const SizedBox(height: 6),
            Text('The old committee keeps its dates in the history and stays on the Team page.', style: bodyStyle(context, color: p.muted, size: 12)),
          ],
          const SizedBox(height: 20),
          GradientButton(label: 'Launch', icon: Icons.rocket_launch_rounded, loading: _busy, onPressed: canLaunch ? () => _go() : null),
        ]),
      ),
    );
  }
}

/// Edit a committee: rename it, move its term or mark it as the one running now. Mirrors the website's
/// Edit committee sheet so both admin surfaces save the same fields.
class _EditSheet extends StatefulWidget {
  const _EditSheet({required this.row});
  final Map<String, dynamic> row;

  @override
  State<_EditSheet> createState() => _EditSheetState();
}

class _EditSheetState extends State<_EditSheet> {
  late final TextEditingController _name = TextEditingController(text: '${widget.row['label']}');
  late final TextEditingController _start;
  late final TextEditingController _end;
  late bool _current = widget.row['is_current'] == true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final term = widget.row['term'] is Map ? Map<String, dynamic>.from(widget.row['term'] as Map) : const <String, dynamic>{};
    _start = TextEditingController(text: '${term['start'] ?? ''}');
    _end = TextEditingController(text: '${term['end'] ?? ''}');
  }

  @override
  void dispose() {
    _name.dispose();
    _start.dispose();
    _end.dispose();
    super.dispose();
  }

  Future<void> _pick(bool first) async {
    final t = DateTime.tryParse(first ? _start.text : _end.text) ?? DateTime.now();
    final d = await showDatePicker(context: context, initialDate: t, firstDate: DateTime(2015), lastDate: DateTime(2100));
    if (d == null || !mounted) return;
    String two(int v) => v.toString().padLeft(2, '0');
    setState(() {
      final iso = '${d.year}-${two(d.month)}-${two(d.day)}';
      if (first) {
        _start.text = iso;
      } else {
        _end.text = iso;
      }
      _error = null;
    });
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.length < 3) {
      setState(() => _error = 'Give the committee a name of at least 3 letters');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final state = context.read<AppState>();
    try {
      await state.api.editCommittee('${widget.row['label']}', name: name, start: _start.text.trim(), end: _end.text.trim(), isCurrent: _current);
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      await state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return Padding(
      padding: EdgeInsets.fromLTRB(22, 0, 22, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Edit committee', style: displayStyle(context, 26)),
          const SizedBox(height: 4),
          Text('Rename the session, move its six-month term, or make it the one shown as current.', style: bodyStyle(context, color: p.muted, size: 13.5)),
          const SizedBox(height: 18),
          AppField(controller: _name, label: 'Committee name', icon: Icons.calendar_today_rounded, maxLength: 50),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: GestureDetector(onTap: _busy ? null : () => _pick(true), child: AbsorbPointer(child: AppField(controller: _start, label: 'First day', icon: Icons.event_rounded)))),
            const SizedBox(width: 12),
            Expanded(child: GestureDetector(onTap: _busy ? null : () => _pick(false), child: AbsorbPointer(child: AppField(controller: _end, label: 'Last day', icon: Icons.event_available_rounded)))),
          ]),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _current,
            activeThumbColor: p.accent,
            onChanged: _busy ? null : (v) => setState(() => _current = v),
            title: Text('Set as current committee', style: bodyStyle(context, weight: FontWeight.w600, size: 14)),
            subtitle: Text('The Team page opens on this session.', style: bodyStyle(context, color: p.muted, size: 12)),
          ),
          if (_error != null) ...[
            const SizedBox(height: 6),
            Text(_error!, style: monoStyle(context, color: const Color(0xFFEF4444), size: 12)),
          ],
          const SizedBox(height: 16),
          GradientButton(label: 'Save changes', icon: Icons.check_rounded, loading: _busy, onPressed: _busy ? null : _save),
        ]),
      ),
    );
  }
}
