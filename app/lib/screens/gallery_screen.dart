import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  String _cat = 'All';

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final p = context.pal;
    final s = state.settings;
    final cats = ['All', ...state.gallery.map((g) => g.category).where((c) => c.isNotEmpty).toSet()];
    final active = cats.contains(_cat) ? _cat : 'All';
    final items = state.gallery.where((g) => active == 'All' || g.category == active).toList();

    return RefreshIndicator(
      color: p.tech,
      onRefresh: state.loadAll,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            sliver: SliverToBoxAdapter(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SectionHeader(eyebrow: s.pageText('galleryTag', 'Moments'), title: s.pageText('galleryTitle', 'Gallery'), subtitle: s.pageText('galleryDesc', 'Snapshots from our events and workshops.')).stagger(0),
                const SizedBox(height: 18),
                SizedBox(
                  height: 42,
                  child: ListView(scrollDirection: Axis.horizontal, children: [
                    for (final c in cats)
                      Padding(padding: const EdgeInsets.only(right: 10), child: PillChip(label: c, selected: c == active, onTap: () => setState(() => _cat = c))),
                  ]),
                ),
                const SizedBox(height: 18),
                if (state.loading && !state.loadedOnce)
                  const ShimmerList(count: 3, height: 180)
                else if (state.error != null && state.gallery.isEmpty)
                  ErrorState(message: state.error!, onRetry: state.loadAll)
                else if (items.isEmpty)
                  const EmptyState(icon: Icons.photo_library_outlined, title: 'No photos yet'),
              ]),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 120),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.9),
              delegate: SliverChildBuilderDelegate(
                childCount: items.length,
                (context, i) {
                  final g = items[i];
                  return GestureDetector(
                    onTap: () => Navigator.of(context).push(PageRouteBuilder<void>(
                      opaque: false,
                      barrierColor: Colors.black87,
                      transitionDuration: const Duration(milliseconds: 300),
                      pageBuilder: (_, __, ___) => GalleryViewer(items: items, initial: i),
                      transitionsBuilder: (_, anim, __, child) => FadeTransition(opacity: anim, child: child),
                    )),
                    child: Hero(
                      tag: 'gallery-${g.id}',
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(22),
                        child: Stack(fit: StackFit.expand, children: [
                          NetImage(g.imageUrl, fallbackLabel: g.title),
                          if (g.title.isNotEmpty)
                            Positioned(
                              left: 0,
                              right: 0,
                              bottom: 0,
                              child: Container(
                                padding: const EdgeInsets.fromLTRB(12, 28, 12, 10),
                                decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Colors.black87])),
                                child: Text(g.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12.5, color: Colors.white, weight: FontWeight.w600)),
                              ),
                            ),
                        ]),
                      ),
                    ),
                  ).stagger(i % 8);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Full-screen swipeable viewer with pinch-zoom.
class GalleryViewer extends StatefulWidget {
  const GalleryViewer({super.key, required this.items, required this.initial});
  final List<GalleryItem> items;
  final int initial;

  @override
  State<GalleryViewer> createState() => _GalleryViewerState();
}

class _GalleryViewerState extends State<GalleryViewer> {
  late final PageController _ctrl = PageController(initialPage: widget.initial);
  late int _index = widget.initial;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final g = widget.items[_index];
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(children: [
        PageView.builder(
          controller: _ctrl,
          itemCount: widget.items.length,
          onPageChanged: (i) => setState(() => _index = i),
          itemBuilder: (_, i) => InteractiveViewer(
            minScale: 1,
            maxScale: 4,
            child: Hero(
              tag: 'gallery-${widget.items[i].id}',
              child: NetImage(widget.items[i].imageUrl, fit: BoxFit.contain),
            ),
          ),
        ),
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          left: 12,
          right: 12,
          child: Row(children: [
            IconButton.filledTonal(onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.close_rounded)),
            const Spacer(),
            Text('${_index + 1} / ${widget.items.length}', style: monoStyle(context, color: Colors.white70)),
          ]),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Container(
            padding: EdgeInsets.fromLTRB(22, 30, 22, MediaQuery.of(context).padding.bottom + 22),
            decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Colors.black87])),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              if (g.title.isNotEmpty) Text(g.title, style: displayStyle(context, 22, color: Colors.white)),
              if (g.description.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text(g.description, style: bodyStyle(context, color: Colors.white70, size: 13.5))),
              if (g.date != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(fmtDate(g.date), style: monoStyle(context, color: Colors.white54))),
            ]),
          ),
        ),
      ]),
    );
  }
}
