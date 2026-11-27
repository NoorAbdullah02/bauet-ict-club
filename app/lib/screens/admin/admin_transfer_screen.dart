import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../core/utils.dart';
import '../../data/api.dart';
import '../../models/models.dart';
import '../../state/app_state.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import 'admin_page.dart';
import 'admin_widgets.dart';

/// Copy or move people from one committee session to another (for example from Summer 2026 to Winter 2026).
class AdminTransferScreen extends StatefulWidget {
  const AdminTransferScreen({super.key});

  @override
  State<AdminTransferScreen> createState() => _AdminTransferScreenState();
}

class _AdminTransferScreenState extends State<AdminTransferScreen> {
  late final AppState _state = context.read<AppState>();
  final _to = TextEditingController();
  final _q = TextEditingController();
  String _from = '';
  String _mode = 'copy';
  String _query = '';
  final Set<int> _picked = {};
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _to.dispose();
    _q.dispose();
    super.dispose();
  }

  List<String> get _sessions {
    final s = _state.members.map((m) => m.session).where((x) => x.isNotEmpty).toSet().toList();
    s.sort((a, b) => sessionRank(b).compareTo(sessionRank(a)));
    return s;
  }

  String get _suggestion {
    final m = RegExp(r'^(Summer|Winter)\s+(\d{4})', caseSensitive: false).firstMatch(_from.trim());
    if (m == null) return '';
    final y = int.tryParse(m.group(2) ?? '');
    if (y == null) return '';
    return m.group(1)!.toLowerCase().contains('summer') ? 'Winter $y' : 'Summer ${y + 1}';
  }

  Future<void> _go() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = await _state.api.adminCall('POST', '/committees/transfer', data: {'ids': _picked.toList(), 'toSession': _to.text.trim(), 'mode': _mode});
      final skipped = r is Map && r['skipped'] is List ? (r['skipped'] as List).length : 0;
      await _state.loadAll(fresh: true);
      if (!mounted) return;
      showSnack(context, '${r is Map ? r['transferred'] : 0} ${_mode == 'move' ? 'moved' : 'copied'}${skipped > 0 ? ', $skipped skipped' : ''}');
      setState(() => _picked.clear());
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final sessions = _sessions;
    if (_from.isEmpty && sessions.isNotEmpty) _from = sessions.first;
    final suggestion = _suggestion;
    final quickTargets = <String>[
      if (suggestion.isNotEmpty && suggestion != _from) suggestion,
      for (final s in sessions)
        if (s != _from && s != suggestion) s,
    ].take(4).toList();
    final people = _state.members.where((m) => m.session == _from).toList()..sort((a, b) => a.order.compareTo(b.order));
    final filtered = people.where((m) => matchesQuery(_query, [m.name, m.position, m.department, m.batch])).toList();
    final filteredPicked = filtered.where((m) => _picked.contains(m.id)).length;
    final allShownPicked = filtered.isNotEmpty && filteredPicked == filtered.length;
    return AdminPage(
      title: 'Transfer people',
      children: [
        PickerField(label: 'From committee', value: _from, options: sessions, icon: Icons.groups_rounded, onChanged: (v) => setState(() {
              _from = v;
              _picked.clear();
            })),
        const SizedBox(height: 12),
        AppField(controller: _to, label: 'To committee (e.g. Winter 2027)', icon: Icons.arrow_forward_rounded, onChanged: () => setState(() {})),
        if (quickTargets.isNotEmpty && _to.text.trim().isEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              for (final t in quickTargets)
                ActionChip(
                  label: Text('Use $t', style: bodyStyle(context, size: 12, color: p.tech, weight: FontWeight.w600)),
                  onPressed: () => setState(() {
                    _to.text = t;
                    _error = null;
                  }),
                ),
            ],
          ),
        ],
        const SizedBox(height: 12),
        Row(children: [
          PillChip(label: 'Copy', selected: _mode == 'copy', onTap: () => setState(() => _mode = 'copy')),
          const SizedBox(width: 10),
          PillChip(label: 'Move', selected: _mode == 'move', onTap: () => setState(() => _mode = 'move')),
        ]),
        const SizedBox(height: 14),
        if (people.isNotEmpty) ...[
          AdminSearchBar(
            controller: _q,
            hint: 'Filter members by name or position…',
            onChanged: (v) => setState(() => _query = v),
            shown: filtered.length,
            total: people.length,
          ),
          const SizedBox(height: 10),
        ],
        Row(children: [
          Text('${_picked.length} OF ${people.length} CHOSEN', style: monoStyle(context)),
          const Spacer(),
          TextButton(
            onPressed: filtered.isEmpty
                ? null
                : () => setState(() {
                      if (allShownPicked) {
                        _picked.removeAll(filtered.map((m) => m.id));
                      } else {
                        _picked.addAll(filtered.map((m) => m.id));
                      }
                    }),
            child: Text(allShownPicked ? 'Clear' : 'Choose all'),
          ),
        ]),
        if (people.isNotEmpty && filtered.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text('No matching members for "$_query".', style: bodyStyle(context, size: 13, color: p.muted)),
          )
        else
          for (final Member m in filtered)
          CheckboxListTile(
            value: _picked.contains(m.id),
            onChanged: (v) => setState(() => v == true ? _picked.add(m.id) : _picked.remove(m.id)),
            title: Text(m.name, style: bodyStyle(context, weight: FontWeight.w600)),
            subtitle: Text(m.position, style: bodyStyle(context, size: 12.5, color: p.muted)),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: bodyStyle(context, size: 13, color: const Color(0xFFEF4444)))),
        const SizedBox(height: 14),
        GradientButton(label: _mode == 'move' ? 'Move chosen people' : 'Copy chosen people', icon: Icons.swap_horiz_rounded, loading: _busy, onPressed: (_busy || _picked.isEmpty || _to.text.trim().isEmpty) ? null : _go),
      ],
    );
  }
}
