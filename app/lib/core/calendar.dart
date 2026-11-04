import '../models/models.dart';

/// Start time of an event: date + free-text time like "03:00 PM" or "15:30" (defaults to 10:00).
DateTime? eventStart(EventItem e) {
  final d = e.date;
  if (d == null) return null;
  var h = 10;
  var m = 0;
  final match = RegExp(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', caseSensitive: false).firstMatch(e.time);
  if (match != null) {
    h = int.parse(match.group(1)!);
    m = int.tryParse(match.group(2) ?? '0') ?? 0;
    final ap = match.group(3)?.toLowerCase();
    if (ap == 'pm' && h < 12) h += 12;
    if (ap == 'am' && h == 12) h = 0;
    if (h > 23 || m > 59) {
      h = 10;
      m = 0;
    }
  }
  return DateTime(d.year, d.month, d.day, h, m);
}

String _stamp(DateTime d) {
  String t(int n) => n.toString().padLeft(2, '0');
  return '${d.year}${t(d.month)}${t(d.day)}T${t(d.hour)}${t(d.minute)}00';
}

/// Google Calendar "add event" link (floating local time, 2h long).
Uri googleCalendarUri(EventItem e) {
  final start = eventStart(e) ?? DateTime.now();
  final end = start.add(const Duration(hours: 2));
  return Uri.https('calendar.google.com', '/calendar/render', {
    'action': 'TEMPLATE',
    'text': e.title,
    'dates': '${_stamp(start)}/${_stamp(end)}',
    'details': e.description,
    'location': e.location,
  });
}
