import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/utils.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import '../widgets/common.dart';
import '../widgets/event_calendar.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  String _filter = 'Upcoming';
  bool _calendar = false;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final p = context.pal;
    var list = [...state.events];
    if (_filter == 'Upcoming') list = list.where((e) => e.isUpcoming).toList();
    if (_filter == 'Past') list = list.where((e) => !e.isUpcoming).toList();
    list.sort((a, b) {
      final ad = a.date ?? DateTime(2000);
      final bd = b.date ?? DateTime(2000);
      return _filter == 'Past' ? bd.compareTo(ad) : (_filter == 'Upcoming' ? ad.compareTo(bd) : bd.compareTo(ad));
    });

    return RefreshIndicator(
      color: p.tech,
      backgroundColor: p.surface,
      onRefresh: state.loadAll,
      child: ListView(
        padding: kPagePadding,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SectionHeader(eyebrow: 'Calendar', title: 'Events', subtitle: 'Workshops, contests and meetups.').stagger(0),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: () => context.push('/tickets'),
              icon: const Icon(Icons.confirmation_number_outlined, size: 18),
              label: const Text('My tickets'),
            ),
          ),
          const SizedBox(height: 14),
          Row(children: [
            PillChip(label: 'List', selected: !_calendar, onTap: () => setState(() => _calendar = false)),
            const SizedBox(width: 10),
            PillChip(label: 'Calendar', selected: _calendar, onTap: () => setState(() => _calendar = true)),
          ]),
          const SizedBox(height: 14),
          if (!_calendar) SizedBox(
            height: 42,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (final f in const ['Upcoming', 'Past', 'All'])
                  Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: PillChip(label: f, selected: _filter == f, onTap: () => setState(() => _filter = f)),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (_calendar)
            EventCalendarView(events: state.events)
          else if (state.loading && !state.loadedOnce)
            const ShimmerList(count: 3, height: 250)
          else if (state.error != null && state.events.isEmpty)
            ErrorState(message: state.error!, onRetry: state.loadAll)
          else if (list.isEmpty)
            const EmptyState(icon: Icons.event_busy_rounded, title: 'Nothing here yet', message: 'Check back soon for new events.')
          else
            for (var i = 0; i < list.length; i++)
              Padding(padding: const EdgeInsets.only(bottom: 16), child: EventCard(event: list[i]).stagger(i)),
        ],
      ),
    );
  }
}

class EventCard extends StatelessWidget {
  const EventCard({super.key, required this.event, this.compact = false});
  final EventItem event;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final p = context.pal;
    final d = event.date;
    return GestureDetector(
      onTap: () => context.push('/events/${event.id}'),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          color: p.surface,
          border: Border.all(color: p.line),
          boxShadow: p.dark ? null : [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 24, offset: const Offset(0, 10))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(children: [
              SizedBox(height: compact ? 130 : 170, width: double.infinity, child: NetImage(event.imageUrl, fallbackLabel: event.title)),
              Positioned.fill(
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.black.withValues(alpha: 0.18), Colors.transparent, p.surface.withValues(alpha: 0.9)], stops: const [0, 0.5, 1])),
                  ),
                ),
              ),
              Positioned(
                left: 14,
                top: 14,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), color: p.bg.withValues(alpha: 0.88), border: Border.all(color: Colors.white.withValues(alpha: 0.25))),
                  child: Column(children: [
                    Text(d == null ? '--' : '${d.day}', style: displayStyle(context, 20, height: 1)),
                    Text(d == null ? '' : monthShort(d).toUpperCase(), style: monoStyle(context, size: 9.5, color: p.tech)),
                  ]),
                ),
              ),
              if (event.featured) const Positioned(right: 14, top: 14, child: Tag('Featured', icon: Icons.star_rounded, color: Color(0xFFFFC857))),
            ]),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (event.category.isNotEmpty) ...[Tag(event.category, color: p.tech), const SizedBox(height: 8)],
                Text(event.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: displayStyle(context, compact ? 18 : 21)),
                const SizedBox(height: 8),
                Row(children: [
                  Icon(Icons.schedule_rounded, size: 14, color: p.muted),
                  const SizedBox(width: 5),
                  Text(event.time.isEmpty ? fmtDate(d) : event.time, style: bodyStyle(context, size: 12.5, color: p.muted)),
                  if (event.location.isNotEmpty) ...[
                    const SizedBox(width: 12),
                    Icon(Icons.place_outlined, size: 14, color: p.muted),
                    const SizedBox(width: 4),
                    Expanded(child: Text(event.location, maxLines: 1, overflow: TextOverflow.ellipsis, style: bodyStyle(context, size: 12.5, color: p.muted))),
                  ],
                ]),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}
