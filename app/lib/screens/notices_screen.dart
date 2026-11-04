import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import 'home_screen.dart' show noticeColor;

class NoticesScreen extends StatelessWidget {
  const NoticesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final list = state.activeNotices;
    return RefreshIndicator(
      color: context.pal.tech,
      onRefresh: state.loadAll,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Announcements', title: 'Notice board', subtitle: 'Official updates from the club.').stagger(0),
          const SizedBox(height: 20),
          if (state.loading && !state.loadedOnce)
            const ShimmerList(count: 4, height: 96)
          else if (state.error != null && state.notices.isEmpty)
            ErrorState(message: state.error!, onRetry: state.loadAll)
          else if (list.isEmpty)
            const EmptyState(icon: Icons.campaign_outlined, title: 'No notices', message: 'You are all caught up.')
          else
            for (var i = 0; i < list.length; i++) _NoticeCard(notice: list[i]).stagger(i),
        ],
      ),
    );
  }
}

class _NoticeCard extends StatefulWidget {
  const _NoticeCard({required this.notice});
  final NoticeItem notice;

  @override
  State<_NoticeCard> createState() => _NoticeCardState();
}

class _NoticeCardState extends State<_NoticeCard> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final n = widget.notice;
    final c = noticeColor(p, n.priority);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: GlassCard(
        padding: EdgeInsets.zero,
        onTap: () => setState(() => _open = !_open),
        child: IntrinsicHeight(
          child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Container(
              width: 5,
              decoration: BoxDecoration(color: c, borderRadius: const BorderRadius.horizontal(left: Radius.circular(24))),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    if (n.pinned) ...[const Tag('Pinned', icon: Icons.push_pin_rounded, color: Color(0xFFFFC857)), const SizedBox(width: 8)],
                    Tag(n.priority, color: c),
                    const Spacer(),
                    Text(fmtDate(n.date), style: monoStyle(context, size: 10)),
                  ]),
                  const SizedBox(height: 10),
                  Text(n.title, style: displayStyle(context, 19)),
                  if (n.imageUrl.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: ClipRRect(borderRadius: BorderRadius.circular(12), child: SizedBox(height: _open ? 170 : 90, width: double.infinity, child: NetImage(n.imageUrl, fallbackLabel: n.title))),
                    ),
                  AnimatedSize(
                    duration: 260.ms,
                    curve: Curves.easeOutCubic,
                    alignment: Alignment.topCenter,
                    child: Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        n.content,
                        maxLines: _open ? null : 2,
                        overflow: _open ? TextOverflow.visible : TextOverflow.ellipsis,
                        style: bodyStyle(context, color: p.muted, size: 14),
                      ),
                    ),
                  ),
                  if (n.content.length > 90)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(_open ? 'Show less' : 'Read more', style: bodyStyle(context, color: p.tech, size: 12.5, weight: FontWeight.w700)),
                    ),
                ]),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
