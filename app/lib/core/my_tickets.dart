import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Tickets this phone registered (kept only on the phone, so people can find them again without the email).
class SavedTicket {
  SavedTicket({required this.code, required this.title, required this.date, this.iso = ''});
  final String code;
  final String title;
  final String date;
  final String iso; // yyyy-mm-dd of the event, to find the next one

  Map<String, String> toJson() => {'code': code, 'title': title, 'date': date, 'iso': iso};
  static SavedTicket? from(dynamic j) {
    if (j is! Map) return null;
    final code = (j['code'] ?? '').toString();
    if (code.isEmpty) return null;
    return SavedTicket(code: code, title: (j['title'] ?? '').toString(), date: (j['date'] ?? '').toString(), iso: (j['iso'] ?? '').toString());
  }
}

const _key = 'my_tickets_v1';

Future<List<SavedTicket>> loadMyTickets() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return [];
    final list = jsonDecode(raw);
    if (list is! List) return [];
    return list.map(SavedTicket.from).whereType<SavedTicket>().toList();
  } catch (_) {
    return [];
  }
}

Future<void> saveMyTicket(SavedTicket t) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final all = await loadMyTickets();
    all.removeWhere((x) => x.code == t.code);
    all.insert(0, t);
    await prefs.setString(_key, jsonEncode(all.take(30).map((e) => e.toJson()).toList()));
  } catch (_) {
    // keeping the list is a convenience only
  }
}

Future<void> forgetMyTicket(String code) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final all = await loadMyTickets()
      ..removeWhere((x) => x.code == code);
    await prefs.setString(_key, jsonEncode(all.map((e) => e.toJson()).toList()));
  } catch (_) {
    // ignore
  }
}

/// The saved ticket of the next event (today or later), or the newest one without a date.
Future<SavedTicket?> nextTicket() async {
  final all = await loadMyTickets();
  final n = DateTime.now();
  final today = '${n.year}-${n.month.toString().padLeft(2, '0')}-${n.day.toString().padLeft(2, '0')}';
  final coming = all.where((t) => t.iso.isNotEmpty && t.iso.compareTo(today) >= 0).toList()..sort((a, b) => a.iso.compareTo(b.iso));
  if (coming.isNotEmpty) return coming.first;
  return null;
}
