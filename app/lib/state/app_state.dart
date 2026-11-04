import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/api.dart';
import '../models/models.dart';

class AppState extends ChangeNotifier {
  AppState({required this.api});

  final Api api;
  SharedPreferences? _prefs;

  ThemeMode themeMode = ThemeMode.dark;

  /// Admin screens are light by default and have their own toggle.
  bool adminDark = false;

  List<EventItem> events = [];
  List<NoticeItem> notices = [];
  List<Member> members = [];
  List<GalleryItem> gallery = [];
  List<Achievement> achievements = [];
  SiteSettings settings = const SiteSettings();

  bool loading = true;
  bool loadedOnce = false;
  /// True when the last refresh failed and cached (older) data is on screen.
  bool offline = false;
  bool _usedCache = false;
  String? error;

  String? adminName;
  bool get isAdmin => api.token != null;

  Future<void> init() async {
    try {
      _prefs = await SharedPreferences.getInstance();
      final t = _prefs?.getString('theme');
      themeMode = t == 'light' ? ThemeMode.light : ThemeMode.dark;
      api.token = _prefs?.getString('token');
      adminName = _prefs?.getString('admin');
      adminDark = _prefs?.getBool('admin_dark') ?? false;
    } catch (_) {
      // Storage unavailable: continue with defaults.
    }
  }

  bool isDark(BuildContext context) => themeMode == ThemeMode.dark;

  void toggleTheme() {
    themeMode = themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    _prefs?.setString('theme', themeMode == ThemeMode.dark ? 'dark' : 'light');
    notifyListeners();
  }

  void toggleAdminTheme() {
    adminDark = !adminDark;
    _prefs?.setBool('admin_dark', adminDark);
    notifyListeners();
  }

  Future<List<T>> _fetch<T>(String table, T Function(Map<String, dynamic>) map) async {
    List<Map<String, dynamic>> rows;
    try {
      rows = await api.list(table);
      await _prefs?.setString('cache_$table', jsonEncode(rows));
    } catch (_) {
      final cached = _readCache(table);
      if (cached is! List) rethrow;
      _usedCache = true;
      rows = cached.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    }
    return rows.map(map).toList();
  }

  dynamic _readCache(String key) {
    try {
      final raw = _prefs?.getString('cache_$key');
      return raw == null ? null : jsonDecode(raw);
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>> _fetchSettings() async {
    try {
      final data = await api.settings();
      await _prefs?.setString('cache_settings', jsonEncode(data));
      return data;
    } catch (_) {
      final cached = _readCache('settings');
      if (cached is! Map) rethrow;
      _usedCache = true;
      return Map<String, dynamic>.from(cached);
    }
  }

  Future<void> loadAll() async {
    loading = true;
    error = null;
    _usedCache = false;
    notifyListeners();
    String? firstError;
    Future<void> guard(Future<void> Function() fn) async {
      try {
        await fn();
      } catch (e) {
        firstError ??= e.toString();
      }
    }

    await Future.wait([
      guard(() async => events = await _fetch('events', EventItem.fromJson)),
      guard(() async => notices = await _fetch('notices', NoticeItem.fromJson)),
      guard(() async => members = await _fetch('members', Member.fromJson)),
      guard(() async => gallery = await _fetch('gallery', GalleryItem.fromJson)),
      guard(() async => achievements = await _fetch('achievements', Achievement.fromJson)),
      guard(() async => settings = SiteSettings.fromJson(await _fetchSettings())),
    ]);
    error = firstError;
    offline = _usedCache;
    loading = false;
    loadedOnce = true;
    notifyListeners();
  }

  Future<void> reloadMembers() async {
    try {
      members = await _fetch('members', Member.fromJson);
      notifyListeners();
    } catch (_) {}
  }

  // ---- derived ----
  List<EventItem> get upcomingEvents {
    final list = events.where((e) => e.isUpcoming).toList()
      ..sort((a, b) => (a.date ?? DateTime(2100)).compareTo(b.date ?? DateTime(2100)));
    return list;
  }

  List<NoticeItem> get activeNotices {
    final list = notices.where((n) => !n.expired).toList()
      ..sort((a, b) {
        if (a.pinned != b.pinned) return a.pinned ? -1 : 1;
        return (b.date ?? DateTime(2000)).compareTo(a.date ?? DateTime(2000));
      });
    return list;
  }

  // ---- auth ----
  Future<void> login(String username, String password) async {
    final res = await api.login(username, password);
    final token = (res['token'] ?? '').toString();
    if (token.isEmpty) throw ApiException('Login failed');
    api.token = token;
    adminName = res['user'] is Map ? (res['user']['username'] ?? username).toString() : username;
    await _prefs?.setString('token', token);
    await _prefs?.setString('admin', adminName ?? '');
    notifyListeners();
  }

  Future<void> logout() async {
    api.token = null;
    adminName = null;
    await _prefs?.remove('token');
    await _prefs?.remove('admin');
    notifyListeners();
  }

  /// Called when an admin request returns 401/403 (expired token).
  Future<void> handleAuthError(Object e) async {
    if (e is ApiException && (e.status == 401 || e.status == 403)) await logout();
  }
}
