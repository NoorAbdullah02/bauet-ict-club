import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/form_widgets.dart';

/// The resource library: slides, notes, tutorials and links, with search and categories.
class ResourcesScreen extends StatefulWidget {
  const ResourcesScreen({super.key});

  @override
  State<ResourcesScreen> createState() => _ResourcesScreenState();
}

class _ResourcesScreenState extends State<ResourcesScreen> {
  late final AppState _state = context.read<AppState>();
  final _q = TextEditingController();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String? _error;
  String _cat = 'All';

  static const _icons = {
    'Slides': Icons.slideshow_rounded,
    'Notes': Icons.description_rounded,
    'Tutorial': Icons.menu_book_rounded,
    'Video': Icons.play_circle_rounded,
    'Code': Icons.code_rounded,
    'Link': Icons.link_rounded,
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final r = await _state.api.list('resources', fresh: true);
      if (mounted) setState(() => _rows = r);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final cats = ['All', ...{for (final r in _rows) if ('${r['category'] ?? ''}'.isNotEmpty) '${r['category']}'}];
    final q = _q.text.trim().toLowerCase();
    final list = _rows.where((r) {
      if (_cat != 'All' && '${r['category']}' != _cat) return false;
      return q.isEmpty || '${r['title']} ${r['description']} ${r['category']} ${r['kind']}'.toLowerCase().contains(q);
    }).toList();
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Learn', title: 'Resource library', subtitle: 'Slides, notes and tutorials from our workshops.'),
          const SizedBox(height: 14),
          AppField(controller: _q, label: 'Search resources', icon: Icons.search_rounded, onChanged: () => setState(() {})),
          if (cats.length > 2) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 42,
              child: ListView(scrollDirection: Axis.horizontal, children: [
                for (final c in cats) Padding(padding: const EdgeInsets.only(right: 10), child: PillChip(label: c, selected: _cat == c, onTap: () => setState(() => _cat = c))),
              ]),
            ),
          ],
          const SizedBox(height: 14),
          if (_loading)
            const ShimmerList(count: 3, height: 120)
          else if (_error != null)
            ErrorState(message: _error!, onRetry: _load)
          else if (list.isEmpty)
            EmptyState(icon: Icons.local_library_outlined, title: _rows.isEmpty ? 'No resources yet' : 'Nothing matches', message: _rows.isEmpty ? 'Check back soon.' : 'Try another word.')
          else
            for (final r in list)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassCard(
                  onTap: () => openUrl(context, '${r['url']}'),
                  padding: const EdgeInsets.all(14),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Container(width: 46, height: 46, decoration: BoxDecoration(borderRadius: BorderRadius.circular(15), color: p.accent.withValues(alpha: 0.12)), child: Icon(_icons['${r['kind']}'] ?? Icons.link_rounded, color: p.accent)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${r['title']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700, size: 15.5)),
                        if ('${r['description'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text('${r['description']}', maxLines: 3, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 13, color: p.muted))),
                        const SizedBox(height: 8),
                        Row(children: [
                          if ('${r['category'] ?? ''}'.isNotEmpty) Tag('${r['category']}', color: p.tech),
                          if ('${r['category'] ?? ''}'.isNotEmpty) const SizedBox(width: 8),
                          Text('${r['kind'] ?? 'Link'}'.toUpperCase(), style: monoStyle(context, size: 9.5, color: p.muted)),
                        ]),
                      ]),
                    ),
                    Icon(Icons.open_in_new_rounded, size: 18, color: p.muted),
                  ]),
                ),
              ),
        ],
      ),
    );
  }
}
