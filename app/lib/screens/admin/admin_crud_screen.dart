import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_widgets.dart';

enum FieldKind { text, multiline, date, boolean, number }

class FieldSpec {
  const FieldSpec(this.key, this.label, [this.kind = FieldKind.text, this.required = false]);
  final String key;
  final String label;
  final FieldKind kind;
  final bool required;
}

class TableSpec {
  const TableSpec({required this.title, required this.titleKey, this.subtitleKey, this.fields = const [], this.readOnly = false, this.icon = Icons.list_alt_rounded});
  final String title;
  final String titleKey;
  final String? subtitleKey;
  final List<FieldSpec> fields;
  final bool readOnly;
  final IconData icon;
}

const Map<String, TableSpec> kTables = {
  'events': TableSpec(
    title: 'Events',
    titleKey: 'title',
    subtitleKey: 'date',
    icon: Icons.event_rounded,
    fields: [
      FieldSpec('title', 'Title', FieldKind.text, true),
      FieldSpec('date', 'Date', FieldKind.date),
      FieldSpec('time', 'Time (e.g. 10:00 AM)'),
      FieldSpec('location', 'Location'),
      FieldSpec('category', 'Category'),
      FieldSpec('image_url', 'Image URL'),
      FieldSpec('description', 'Description', FieldKind.multiline),
      FieldSpec('featured', 'Featured', FieldKind.boolean),
    ],
  ),
  'notices': TableSpec(
    title: 'Notices',
    titleKey: 'title',
    subtitleKey: 'date',
    icon: Icons.campaign_rounded,
    fields: [
      FieldSpec('title', 'Title', FieldKind.text, true),
      FieldSpec('date', 'Date', FieldKind.date),
      FieldSpec('priority', 'Priority (normal / high / low)'),
      FieldSpec('expiry_date', 'Expiry date', FieldKind.date),
      FieldSpec('content', 'Content', FieldKind.multiline),
      FieldSpec('pinned', 'Pinned', FieldKind.boolean),
    ],
  ),
  'members': TableSpec(
    title: 'Team members',
    titleKey: 'name',
    subtitleKey: 'position',
    icon: Icons.groups_rounded,
    fields: [
      FieldSpec('name', 'Name', FieldKind.text, true),
      FieldSpec('position', 'Position', FieldKind.text, true),
      FieldSpec('committee_session', 'Session (e.g. Summer 2026)'),
      FieldSpec('department', 'Department'),
      FieldSpec('batch', 'Batch'),
      FieldSpec('display_order', 'Display order', FieldKind.number),
      FieldSpec('image_url', 'Photo URL'),
      FieldSpec('social_fb', 'Facebook link'),
      FieldSpec('social_gh', 'GitHub link'),
      FieldSpec('social_li', 'LinkedIn link'),
    ],
  ),
  'gallery': TableSpec(
    title: 'Gallery',
    titleKey: 'title',
    subtitleKey: 'category',
    icon: Icons.photo_library_rounded,
    fields: [
      FieldSpec('title', 'Title'),
      FieldSpec('image_url', 'Image URL', FieldKind.text, true),
      FieldSpec('category', 'Category'),
      FieldSpec('date', 'Date', FieldKind.date),
      FieldSpec('description', 'Description', FieldKind.multiline),
    ],
  ),
  'achievements': TableSpec(
    title: 'Achievements',
    titleKey: 'title',
    subtitleKey: 'date',
    icon: Icons.emoji_events_rounded,
    fields: [
      FieldSpec('title', 'Title', FieldKind.text, true),
      FieldSpec('date', 'Date', FieldKind.date),
      FieldSpec('icon', 'Icon (award, star, code, rocket...)'),
      FieldSpec('description', 'Description', FieldKind.multiline),
    ],
  ),
  'messages': TableSpec(
    title: 'Messages',
    titleKey: 'name',
    subtitleKey: 'subject',
    readOnly: true,
    icon: Icons.mail_rounded,
    fields: [
      FieldSpec('name', 'Name'),
      FieldSpec('email', 'Email'),
      FieldSpec('subject', 'Subject'),
      FieldSpec('message', 'Message', FieldKind.multiline),
    ],
  ),
};

String _display(dynamic v, FieldKind k) {
  if (v == null) return '';
  if (k == FieldKind.date) return _dateOnly(v);
  return v.toString();
}

String _dateOnly(dynamic v) {
  final d = DateTime.tryParse(v.toString())?.toLocal();
  if (d == null) return '';
  String two(int n) => n.toString().padLeft(2, '0');
  return '${d.year}-${two(d.month)}-${two(d.day)}';
}

/// Generic list + create/edit/delete screen for simple admin tables.
class AdminCrudScreen extends StatefulWidget {
  const AdminCrudScreen({super.key, required this.table});
  final String table;

  @override
  State<AdminCrudScreen> createState() => _AdminCrudScreenState();
}

class _AdminCrudScreenState extends State<AdminCrudScreen> {
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String? _error;

  TableSpec get _spec => kTables[widget.table] ?? kTables['events']!;
  late final AppState _state = context.read<AppState>();

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
      final rows = await _state.api.list(widget.table);
      if (mounted) setState(() => _rows = rows);
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _afterChange() async {
    await _load();
    // keep the public caches in sync
    if (mounted) await _state.loadAll();
  }

  Future<void> _openForm([Map<String, dynamic>? row]) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _RowForm(table: widget.table, spec: _spec, row: row),
    );
    if (saved == true) {
      if (mounted) showSnack(context, row == null ? 'Created' : 'Saved');
      await _afterChange();
    }
  }

  Future<void> _delete(Map<String, dynamic> row) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete this item?'),
        content: Text('"${row[_spec.titleKey] ?? ''}" will be removed permanently.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: Color(0xFFEF4444)))),
        ],
      ),
    );
    if (yes != true) return;
    try {
      await _state.api.remove(widget.table, int.parse(row['id'].toString()));
      if (mounted) showSnack(context, 'Deleted');
      await _afterChange();
    } on ApiException catch (e) {
      await _state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  void _view(Map<String, dynamic> row) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(22, 0, 22, 28),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          for (final f in _spec.fields)
            if ((row[f.key] ?? '').toString().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(f.label.toUpperCase(), style: monoStyle(ctx, size: 10)),
                  const SizedBox(height: 2),
                  SelectableText(row[f.key].toString(), style: bodyStyle(ctx)),
                ]),
              ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final spec = _spec;
    return Scaffold(
      floatingActionButton: spec.readOnly
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openForm(),
              backgroundColor: p.accent,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_rounded),
              label: const Text('New'),
            ),
      body: AuroraBackground(
        child: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(children: [
                IconButton(onPressed: () => context.canPop() ? context.pop() : context.go('/admin'), icon: const Icon(Icons.arrow_back_rounded)),
                Expanded(child: Text(spec.title, style: displayStyle(context, 24))),
                const AdminThemeButton(),
                IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
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
                      const ShimmerList(count: 5, height: 78)
                    else if (_error != null)
                      ErrorState(message: _error!, onRetry: _load)
                    else if (_rows.isEmpty)
                      EmptyState(icon: spec.icon, title: 'Nothing here yet')
                    else
                      for (var i = 0; i < _rows.length; i++)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _RowTile(
                            spec: spec,
                            row: _rows[i],
                            onTap: () => spec.readOnly ? _view(_rows[i]) : _openForm(_rows[i]),
                            onDelete: () => _delete(_rows[i]),
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

class _RowTile extends StatelessWidget {
  const _RowTile({required this.spec, required this.row, required this.onTap, required this.onDelete});
  final TableSpec spec;
  final Map<String, dynamic> row;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final sub = spec.subtitleKey == null
        ? ''
        : _display(
            row[spec.subtitleKey],
            spec.fields.firstWhere((f) => f.key == spec.subtitleKey, orElse: () => const FieldSpec('x', 'x')).kind,
          );
    return GlassCard(
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(16, 12, 6, 12),
      child: Row(children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(13), color: p.accent.withValues(alpha: 0.15)),
          child: Icon(spec.icon, color: p.accent, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text((row[spec.titleKey] ?? '').toString(), maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700)),
            if (sub.isNotEmpty) Text(sub, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12.5, color: p.muted)),
          ]),
        ),
        IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 22)),
      ]),
    );
  }
}

class _RowForm extends StatefulWidget {
  const _RowForm({required this.table, required this.spec, this.row});
  final String table;
  final TableSpec spec;
  final Map<String, dynamic>? row;

  @override
  State<_RowForm> createState() => _RowFormState();
}

class _RowFormState extends State<_RowForm> {
  final Map<String, TextEditingController> _ctrl = {};
  final Map<String, bool> _bools = {};
  final Map<String, String> _errors = {};
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    for (final f in widget.spec.fields) {
      final v = widget.row?[f.key];
      if (f.kind == FieldKind.boolean) {
        _bools[f.key] = v == true;
      } else {
        _ctrl[f.key] = TextEditingController(text: _display(v, f.kind));
      }
    }
  }

  @override
  void dispose() {
    for (final c in _ctrl.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate(FieldSpec f) async {
    final c = _ctrl[f.key]!;
    final initial = DateTime.tryParse(c.text) ?? DateTime.now();
    final picked = await showDatePicker(context: context, initialDate: initial, firstDate: DateTime(2015), lastDate: DateTime(2100));
    if (picked != null) {
      String two(int n) => n.toString().padLeft(2, '0');
      setState(() => c.text = '${picked.year}-${two(picked.month)}-${two(picked.day)}');
    }
  }

  Future<void> _save() async {
    final errs = <String, String>{};
    final body = <String, dynamic>{};
    for (final f in widget.spec.fields) {
      if (f.kind == FieldKind.boolean) {
        body[f.key] = _bools[f.key] ?? false;
        continue;
      }
      final t = _ctrl[f.key]!.text.trim();
      if (f.required && t.isEmpty) errs[f.key] = 'Required';
      if (f.kind == FieldKind.number) {
        body[f.key] = int.tryParse(t) ?? 0;
      } else if (f.kind == FieldKind.date) {
        body[f.key] = t.isEmpty ? null : t;
      } else {
        body[f.key] = t;
      }
    }
    setState(() {
      _errors
        ..clear()
        ..addAll(errs);
    });
    if (errs.isNotEmpty) return;
    setState(() => _busy = true);
    final state = context.read<AppState>();
    try {
      if (widget.row == null) {
        await state.api.create(widget.table, body);
      } else {
        await state.api.update(widget.table, int.parse(widget.row!['id'].toString()), body);
      }
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      await state.handleAuthError(e);
      if (mounted) showSnack(context, e.message, error: true);
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
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(widget.row == null ? 'New ${widget.spec.title.toLowerCase()}' : 'Edit', style: displayStyle(context, 26)),
          const SizedBox(height: 18),
          for (final f in widget.spec.fields)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: f.kind == FieldKind.boolean
                  ? SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(f.label, style: bodyStyle(context, weight: FontWeight.w600)),
                      value: _bools[f.key] ?? false,
                      onChanged: (v) => setState(() => _bools[f.key] = v),
                    )
                  : f.kind == FieldKind.date
                      ? GestureDetector(
                          onTap: () => _pickDate(f),
                          child: AbsorbPointer(
                            child: AppField(controller: _ctrl[f.key]!, label: f.label, error: _errors[f.key], icon: Icons.calendar_month_rounded),
                          ),
                        )
                      : AppField(
                          controller: _ctrl[f.key]!,
                          label: f.label + (f.required ? ' *' : ''),
                          error: _errors[f.key],
                          maxLines: f.kind == FieldKind.multiline ? 5 : 1,
                          keyboard: f.kind == FieldKind.number ? TextInputType.number : (f.kind == FieldKind.multiline ? TextInputType.multiline : null),
                        ),
            ),
          const SizedBox(height: 6),
          GradientButton(label: 'Save', icon: Icons.save_rounded, loading: _busy, onPressed: _save),
        ]),
      ),
    );
  }
}
