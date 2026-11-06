import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Small copies of things people must be able to open without internet (a ticket at the gate, a member card).
Future<void> cacheJson(String key, Map<String, dynamic> value) async {
  try {
    final p = await SharedPreferences.getInstance();
    await p.setString('cache_$key', jsonEncode({'at': DateTime.now().toIso8601String(), 'data': value}));
  } catch (_) {
    // a cache that cannot be written is not a problem
  }
}

/// The saved copy and when it was saved, or null.
Future<({Map<String, dynamic> data, DateTime at})?> readCachedJson(String key) async {
  try {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString('cache_$key');
    if (raw == null) return null;
    final j = jsonDecode(raw);
    if (j is! Map || j['data'] is! Map) return null;
    return (data: Map<String, dynamic>.from(j['data'] as Map), at: DateTime.tryParse('${j['at']}') ?? DateTime.now());
  } catch (_) {
    return null;
  }
}
