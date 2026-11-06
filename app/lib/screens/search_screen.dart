import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../data/api.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/form_widgets.dart';
import 'event_detail_screen.dart';

/// Search the whole club: events, notices, people, projects and FAQ in one box.
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late final AppState _state = context.read<AppState>();
  final _q = TextEditingController();
  Timer? _debounce;
  int _seq = 0;
  List<Map<String, dynamic>>? _rows;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  void _changed() {
    _debounce?.cancel();
    final t = _q.text.trim();
    if (t.length < 2) {
      setState(() {
        _rows = null;
        _busy = false;
        _error = null;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 250), () => _run(t));
  }

  Future<void> _run(String t) async {
    final mine = ++_seq;
    setState(() => _busy = true);
    try {
      final r = await _state.api.search(t);
      if (mounted && mine == _seq) setState(() { _rows = r; _error = null; });
    } on ApiException catch (e) {
      if (mounted && mine == _seq) setState(() { _rows = []; _error = e.message; });
    } finally {
      if (mounted && mine == _seq) setState(() => _busy = false);
    }
  }

  void _open(Map<String, dynamic> r) {
    final path = '${r['path']}';
    // the bottom-bar pages are tabs (go); detail pages open on top (push)
    if (path.startsWith('/events/') || path.startsWith('/card/')) {
      context.push(path);
    } else {
      context.go(path);
    }
  }

  static const _kinds = {
    'event': ('Events', Icons.event_rounded),
    'notice': ('Notices', Icons.campaign_rounded),
    'member': ('People', Icons.person_rounded),
    'project': ('Projects', Icons.code_rounded),
    'faq': ('Questions', Icons.help_rounded),
    'resource': ('Resources', Icons.local_library_rounded),
  };

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final rows = _rows;
    return Scaffold(
      body: AuroraBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Column(children: [
              const PageTopBar(title: 'Search', fallback: '/home'),
              const SizedBox(height: 14),
              AppField(
                controller: _q,
                label: 'Events, notices, people, projects…',
                icon: Icons.search_rounded,
                textInputAction: TextInputAction.search,
                onChanged: _changed,
                onSubmitted: () => _q.text.trim().length >= 2 ? _run(_q.text.trim()) : null,
              ),
              if (_busy) const Padding(padding: EdgeInsets.only(top: 8), child: LinearProgressIndicator(minHeight: 2)),
              const SizedBox(height: 10),
              Expanded(
                child: rows == null
                    ? const EmptyState(icon: Icons.search_rounded, title: 'Search the club', message: 'Type at least two letters. Try a workshop name, a person or a question.')
                    : rows.isEmpty
                        ? EmptyState(icon: Icons.search_off_rounded, title: 'Nothing found', message: _error ?? 'Try another word.')
                        : ListView.separated(
                            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                            padding: const EdgeInsets.only(bottom: 40),
                            itemCount: rows.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (context, i) {
                              final r = rows[i];
                              final k = _kinds['${r['type']}'] ?? ('Result', Icons.search_rounded);
                              return GlassCard(
                                onTap: () => _open(r),
                                padding: const EdgeInsets.all(12),
                                child: Row(children: [
                                  Container(width: 40, height: 40, decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: p.accent.withValues(alpha: 0.12)), child: Icon(k.$2, color: p.accent, size: 20)),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                      Text('${r['title']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: bodyStyle(context, weight: FontWeight.w700, size: 14.5)),
                                      if ('${r['sub'] ?? ''}'.isNotEmpty) Text('${r['sub']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12.5, color: p.muted)),
                                    ]),
                                  ),
                                  Text(k.$1.toUpperCase(), style: monoStyle(context, size: 9, color: p.muted)),
                                ]),
                              );
                            },
                          ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}
