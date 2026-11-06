import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/forms.dart';
import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_page.dart';
import 'admin_widgets.dart';

const Map<String, String> kTypeLabels = {
  'short': 'Short answer',
  'long': 'Paragraph',
  'email': 'Email',
  'phone': 'Mobile number',
  'number': 'Number',
  'dropdown': 'Dropdown',
  'radio': 'Multiple choice',
  'checkbox': 'Checkboxes',
  'date': 'Date',
  'time': 'Time',
  'yesno': 'Yes / No',
  'scale': 'Rating scale',
  'photo': 'Picture upload',
  'section': 'Heading / note',
};

String _newId() => 'f${Random().nextInt(1 << 31).toRadixString(36).padLeft(6, '0').substring(0, 6)}';

/// Stand-alone public forms: list, create, copy, open or close, delete, and open the editor or the responses.
class AdminFormsScreen extends StatefulWidget {
  const AdminFormsScreen({super.key});

  @override
  State<AdminFormsScreen> createState() => _AdminFormsScreenState();
}

class _AdminFormsScreenState extends State<AdminFormsScreen> {
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
    setState(() => _error = null);
    try {
      final r = await _state.api.adminList('/forms');
      if (mounted) setState(() => _rows = r);
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    final c = TextEditingController();
    final title = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New form'),
        content: TextField(controller: c, autofocus: true, decoration: const InputDecoration(labelText: 'Form name')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: const Text('Create')),
        ],
      ),
    );
    c.dispose();
    if (title == null || title.length < 2) return;
    try {
      final f = await _state.api.adminCall('POST', '/forms', data: {'title': title});
      await _load();
      if (mounted && f is Map) await context.push('/admin/forms/${f['id']}');
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _act(Future<void> Function() job, String ok) async {
    try {
      await job();
      if (mounted) showSnack(context, ok);
      await _load();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return AdminPage(
      title: 'Forms',
      onRefresh: _load,
      actions: [IconButton(tooltip: 'New form', onPressed: _create, icon: const Icon(Icons.add_circle_outline_rounded))],
      children: [
        if (_loading)
          const ShimmerList(count: 3, height: 120)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else if (_rows.isEmpty)
          const EmptyState(icon: Icons.dynamic_form_outlined, title: 'No forms yet', message: 'Tap + to make a feedback form, poll or sign-up sheet.')
        else
          for (final f in _rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassCard(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text('${f['title']}', style: bodyStyle(context, weight: FontWeight.w700, size: 16))),
                    Tag(f['is_open'] == false ? 'Closed' : 'Open', color: f['is_open'] == false ? const Color(0xFFEF4444) : p.tech),
                  ]),
                  const SizedBox(height: 4),
                  Text('/f/${f['slug']} · ${f['responses'] ?? 0} responses', style: monoStyle(context, size: 11, color: p.muted)),
                  const SizedBox(height: 6),
                  Wrap(spacing: 4, children: [
                    TextButton.icon(onPressed: () async { await context.push('/admin/forms/${f['id']}'); _load(); }, icon: const Icon(Icons.edit_rounded, size: 16), label: const Text('Edit')),
                    TextButton.icon(onPressed: () => context.push('/admin/forms/${f['id']}/responses'), icon: const Icon(Icons.table_rows_rounded, size: 16), label: const Text('Responses')),
                    TextButton.icon(
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: '${AppConfig.origin}/f/${f['slug']}'));
                        if (context.mounted) showSnack(context, 'Link copied');
                      },
                      icon: const Icon(Icons.link_rounded, size: 16),
                      label: const Text('Copy link'),
                    ),
                    TextButton.icon(onPressed: () => _act(() async { await _state.api.adminCall('POST', '/forms/${f['id']}/duplicate'); }, 'Form copied'), icon: const Icon(Icons.copy_rounded, size: 16), label: const Text('Copy')),
                    TextButton.icon(
                      onPressed: () => _act(() async { await _state.api.adminCall('PUT', '/forms/${f['id']}', data: {'is_open': f['is_open'] == false}); }, f['is_open'] == false ? 'Form opened' : 'Form closed'),
                      icon: Icon(f['is_open'] == false ? Icons.lock_open_rounded : Icons.lock_outline_rounded, size: 16),
                      label: Text(f['is_open'] == false ? 'Open' : 'Close'),
                    ),
                    TextButton.icon(
                      onPressed: () async {
                        if (await confirmAction(context, title: 'Delete this form?', message: 'It goes to the Trash with its responses.', confirmText: 'Delete', danger: true)) {
                          await _act(() async { await _state.api.adminCall('DELETE', '/forms/${f['id']}'); }, 'Moved to Trash');
                        }
                      },
                      icon: const Icon(Icons.delete_outline_rounded, size: 16),
                      label: const Text('Delete'),
                    ),
                  ]),
                ]),
              ),
            ),
      ],
    );
  }
}

/// Form editor: name, description, link name, limit, and the list of questions (add, edit, move, remove).
class AdminFormEditScreen extends StatefulWidget {
  const AdminFormEditScreen({super.key, required this.formId});
  final int formId;

  @override
  State<AdminFormEditScreen> createState() => _AdminFormEditScreenState();
}

class _AdminFormEditScreenState extends State<AdminFormEditScreen> {
  late final AppState _state = context.read<AppState>();
  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _slug = TextEditingController();
  final _cap = TextEditingController();
  Map<String, dynamic> _regForm = {};
  List<Q> _fields = [];
  bool _open = true;
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
    _title.dispose();
    _desc.dispose();
    _slug.dispose();
    _cap.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final all = await _state.api.adminList('/forms');
      final f = all.where((x) => '${x['id']}' == '${widget.formId}').firstOrNull;
      if (f == null) throw ApiException('Form not found', status: 404);
      if (!mounted) return;
      setState(() {
        _title.text = '${f['title'] ?? ''}';
        _desc.text = '${f['description'] ?? ''}';
        _slug.text = '${f['slug'] ?? ''}';
        _cap.text = (int.tryParse('${f['capacity'] ?? 0}') ?? 0) > 0 ? '${f['capacity']}' : '';
        _open = f['is_open'] != false;
        _regForm = f['reg_form'] is Map ? Map<String, dynamic>.from(f['reg_form'] as Map) : <String, dynamic>{};
        _fields = fieldsOfForm(_regForm).map((e) => Map<String, dynamic>.from(e)).toList();
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_fields.any((q) => qLabel(q).trim().isEmpty)) {
      showSnack(context, 'Every question needs a title', error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      await _state.api.adminCall('PUT', '/forms/${widget.formId}', data: {
        'title': _title.text.trim(),
        'description': _desc.text.trim(),
        'slug': _slug.text.trim(),
        'capacity': int.tryParse(_cap.text.trim()) ?? 0,
        'is_open': _open,
        'reg_form': {..._regForm, 'fields': _fields},
      });
      if (mounted) {
        showSnack(context, 'Saved');
        context.pop();
      }
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addQuestion() async {
    final type = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: ListView(shrinkWrap: true, children: [
          for (final e in kTypeLabels.entries) ListTile(title: Text(e.value), onTap: () => Navigator.pop(ctx, e.key)),
        ]),
      ),
    );
    if (type == null) return;
    setState(() => _fields.add({
          'id': _newId(),
          'type': type,
          'label': '',
          'required': false,
          if (['dropdown', 'radio', 'checkbox'].contains(type)) 'options': ['Option 1', 'Option 2'],
          if (type == 'scale') 'scale': {'max': 5, 'low': '', 'high': ''},
        }));
  }

  void _move(int i, int d) {
    final j = i + d;
    if (j < 0 || j >= _fields.length) return;
    setState(() {
      final q = _fields.removeAt(i);
      _fields.insert(j, q);
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return AdminPage(
      title: 'Edit form',
      children: [
        if (_loading)
          const ShimmerList(count: 3, height: 100)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else ...[
          GlassCard(
            padding: const EdgeInsets.all(18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppField(controller: _title, label: 'Form name', icon: Icons.title_rounded),
              const SizedBox(height: 12),
              AppField(controller: _desc, label: 'Description (optional)', maxLines: 3),
              const SizedBox(height: 12),
              AppField(controller: _slug, label: 'Link name (/f/…)', icon: Icons.link_rounded),
              const SizedBox(height: 12),
              AppField(controller: _cap, label: 'Limit of responses (empty = no limit)', keyboard: TextInputType.number, icon: Icons.people_alt_rounded),
              SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Accepting responses'), value: _open, onChanged: (v) => setState(() => _open = v)),
            ]),
          ),
          const SizedBox(height: 16),
          Text('QUESTIONS', style: monoStyle(context)),
          const SizedBox(height: 10),
          for (var i = 0; i < _fields.length; i++) _QuestionCard(key: ValueKey(qId(_fields[i])), q: _fields[i], index: i, count: _fields.length, onMove: (d) => _move(i, d), onRemove: () => setState(() => _fields.removeAt(i)), onChanged: () => setState(() {})),
          const SizedBox(height: 6),
          OutlinedButton.icon(onPressed: _addQuestion, icon: const Icon(Icons.add_rounded), label: const Text('Add a question')),
          const SizedBox(height: 18),
          if (_regForm['payment'] is Map && (_regForm['payment'] as Map)['enabled'] == true)
            Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('This form takes payments. Change the fee on the website admin.', style: bodyStyle(context, size: 12.5, color: p.muted))),
          GradientButton(label: 'Save form', icon: Icons.check_rounded, loading: _busy, onPressed: _busy ? null : _save),
        ],
      ],
    );
  }
}

class _QuestionCard extends StatefulWidget {
  const _QuestionCard({super.key, required this.q, required this.index, required this.count, required this.onMove, required this.onRemove, required this.onChanged});
  final Q q;
  final int index;
  final int count;
  final void Function(int delta) onMove;
  final VoidCallback onRemove;
  final VoidCallback onChanged;

  @override
  State<_QuestionCard> createState() => _QuestionCardState();
}

class _QuestionCardState extends State<_QuestionCard> {
  late final TextEditingController _label = TextEditingController(text: qLabel(widget.q));
  late final TextEditingController _options = TextEditingController(text: qOptions(widget.q).join('\n'));

  @override
  void dispose() {
    _label.dispose();
    _options.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final q = widget.q;
    final t = qType(q);
    final hasOptions = ['dropdown', 'radio', 'checkbox'].contains(t);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GlassCard(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Tag(kTypeLabels[t] ?? t, color: p.accent),
            const Spacer(),
            IconButton(visualDensity: VisualDensity.compact, onPressed: widget.index == 0 ? null : () => widget.onMove(-1), icon: const Icon(Icons.arrow_upward_rounded, size: 18)),
            IconButton(visualDensity: VisualDensity.compact, onPressed: widget.index == widget.count - 1 ? null : () => widget.onMove(1), icon: const Icon(Icons.arrow_downward_rounded, size: 18)),
            IconButton(visualDensity: VisualDensity.compact, onPressed: widget.onRemove, icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFFEF4444))),
          ]),
          AppField(controller: _label, label: t == 'section' ? 'Heading' : 'Question', onChanged: () {
            q['label'] = _label.text;
            widget.onChanged();
          }),
          if (hasOptions) ...[
            const SizedBox(height: 10),
            AppField(controller: _options, label: 'Options (one per line)', maxLines: 6, onChanged: () {
              q['options'] = _options.text.split('\n').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
            }),
          ],
          if (t != 'section')
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              title: const Text('Required'),
              value: qRequired(q),
              onChanged: (v) {
                q['required'] = v;
                widget.onChanged();
              },
            ),
        ]),
      ),
    );
  }
}

/// Responses of one form: who answered what, with delete.
class AdminFormResponsesScreen extends StatefulWidget {
  const AdminFormResponsesScreen({super.key, required this.formId});
  final int formId;

  @override
  State<AdminFormResponsesScreen> createState() => _AdminFormResponsesScreenState();
}

class _AdminFormResponsesScreenState extends State<AdminFormResponsesScreen> {
  late final AppState _state = context.read<AppState>();
  List<Map<String, dynamic>> _rows = [];
  List<Q> _fields = [];
  String _title = 'Responses';
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final forms = await _state.api.adminList('/forms');
      final f = forms.where((x) => '${x['id']}' == '${widget.formId}').firstOrNull;
      final rows = await _state.api.adminList('/forms/${widget.formId}/responses');
      if (!mounted) return;
      setState(() {
        _rows = rows;
        if (f != null) {
          _title = '${f['title']}';
          _fields = fieldsOfForm(f['reg_form'] is Map ? Map<String, dynamic>.from(f['reg_form'] as Map) : {});
        }
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      await _state.handleAuthError(e);
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    return AdminPage(
      title: _title,
      onRefresh: _load,
      children: [
        if (_loading)
          const ShimmerList(count: 3, height: 120)
        else if (_error != null)
          ErrorState(message: _error!, onRetry: _load)
        else ...[
          Text('${_rows.length} RESPONSES', style: monoStyle(context)),
          const SizedBox(height: 10),
          if (_rows.isEmpty) const EmptyState(icon: Icons.inbox_outlined, title: 'No responses yet', message: 'Share the form link to start collecting answers.'),
          for (final r in _rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GlassCard(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  for (final q in _fields.where((q) => qType(q) != 'section'))
                    if (r['answers'] is Map && !isBlank((r['answers'] as Map)[qId(q)]))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(qLabel(q), style: bodyStyle(context, size: 12, color: p.muted)),
                          SelectableText(showValue((r['answers'] as Map)[qId(q)]), style: bodyStyle(context, size: 14.5)),
                        ]),
                      ),
                  Row(children: [
                    Text('${r['created_at'] ?? ''}'.replaceFirst('T', ' ').split('.').first, style: monoStyle(context, size: 10.5, color: p.muted)),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: () async {
                        if (!await confirmAction(context, title: 'Delete this response?', confirmText: 'Delete', danger: true)) return;
                        try {
                          await _state.api.adminCall('DELETE', '/forms/responses/${r['id']}');
                          await _load();
                        } on ApiException catch (e) {
                          if (context.mounted) showSnack(context, e.message, error: true);
                        }
                      },
                      icon: const Icon(Icons.delete_outline_rounded, size: 16),
                      label: const Text('Delete'),
                    ),
                  ]),
                ]),
              ),
            ),
        ],
      ],
    );
  }
}
