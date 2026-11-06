import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Tickets this phone registered (kept only on the phone, so people can find them again without the email).
class SavedTicket {
  SavedTicket({required this.code, required this.title, required this.date});
  final String code;
  final String title;
  final String date;

  Map<String, String> toJson() => {'code': code, 'title': title, 'date': date};
  static SavedTicket? from(dynamic j) {
    if (j is! Map) return null;
    final code = (j['code'] ?? '').toString();
    if (code.isEmpty) return null;
    return SavedTicket(code: code, title: (j['title'] ?? '').toString(), date: (j['date'] ?? '').toString());
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
