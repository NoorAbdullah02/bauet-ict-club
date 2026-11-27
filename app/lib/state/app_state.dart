import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/api.dart';
import '../core/utils.dart';
import '../core/i18n.dart';
import '../models/models.dart';

class AppState extends ChangeNotifier {
  AppState({required this.api});

  final Api api;
  SharedPreferences? _prefs;

  ThemeMode themeMode = ThemeMode.light;

  /// Phone notifications (new event, notice...). On by default; the person can switch them off in the side menu.
  bool pushOn = true;

  /// What the person wants to hear about (the server also sends urgent news to everyone).
  static const pushTopicNames = ['events', 'notices', 'jobs', 'contests', 'projects'];
  Set<String> pushTopics = {...pushTopicNames};

  void setPushTopic(String t, bool on) {
    on ? pushTopics.add(t) : pushTopics.remove(t);
    _prefs?.setStringList('push_topics', pushTopics.toList());
    notifyListeners();
  }

  void setPush(bool v) {
    pushOn = v;
    _prefs?.setBool('push', v);
    notifyListeners();
  }

  /// 'en' or 'bn' (Bangla).
  String get lang => currentLang;

  void setLang(String l) {
    currentLang = l == 'bn' ? 'bn' : 'en';
    _prefs?.setString('lang', currentLang);
    notifyListeners();
  }

  /// Admin screens are light by default and have their own toggle.
  bool adminDark = false;

  List<EventItem> events = [];
  List<NoticeItem> notices = [];
  List<Member> members = [];
  List<GalleryItem> gallery = [];
  List<Achievement> achievements = [];
  List<ProjectItem> projects = [];
  List<FaqItem> faqs = [];
  List<Sponsor> sponsors = [];
  List<Advisor> advisors = [];
  List<WeeklySession> weeklySessions = [];
  List<Map<String, dynamic>> testimonials = [];
  SiteSettings settings = const SiteSettings();

  bool loading = true;
  bool loadedOnce = false;
  /// True when the last refresh failed and cached (older) data is on screen.
  bool offline = false;
  bool _usedCache = false;
  String? error;

  String? adminName;

  /// What the server says this login may do: 'superadmin' (main admin), 'admin' or 'editor'.
  /// It is read from /auth/me at sign-in and refreshed on every start, so a demotion applies at once.
  String? adminRole;

  bool get isAdmin => api.token != null;
  bool get isSuperAdmin => adminRole == 'superadmin';

  /// Editors may add and edit content and forms. The server keeps deleting, the trash, the activity log,
  /// downloads, committees, team logins, e-mail tools and backups for the main admin.
  bool get isEditor => adminRole == 'editor';

  Future<void> init() async {
    api.wake(); // wake the (free, sleeping) server while the app starts; not awaited
    try {
      _prefs = await SharedPreferences.getInstance();
      final t = _prefs?.getString('theme');
      currentLang = _prefs?.getString('lang') == 'bn' ? 'bn' : 'en';
      themeMode = t == 'dark' ? ThemeMode.dark : t == 'system' ? ThemeMode.system : ThemeMode.light;
      api.token = _prefs?.getString('token');
      adminName = _prefs?.getString('admin');
      adminRole = _prefs?.getString('admin_role');
      adminDark = _prefs?.getBool('admin_dark') ?? false;
      pushOn = _prefs?.getBool('push') ?? true;
      final saved = _prefs?.getStringList('push_topics');
      if (saved != null) pushTopics = saved.where(pushTopicNames.contains).toSet();
      _hydrateCache();
    } catch (_) {
      // Storage unavailable: continue with defaults.
    }
    if (api.token != null) _refreshAdmin(); // not awaited: the first screen must not wait for it
  }

  /// Hydrate cached lists immediately on start so Home renders on frame 1 while live data syncs in background.
  void _hydrateCache() {
    List<T> cachedList<T>(String key, T Function(Map<String, dynamic>) map) {
      final raw = _readCache(key);
      if (raw is! List) return [];
      return raw.whereType<Map>().map((e) => map(Map<String, dynamic>.from(e))).toList();
    }

    final ev = cachedList('events', EventItem.fromJson);
    final mem = cachedList('members', Member.fromJson);
    if (ev.isEmpty && mem.isEmpty) return;

    events = ev;
    members = mem;
    notices = cachedList('notices', NoticeItem.fromJson);
    gallery = cachedList('gallery', GalleryItem.fromJson);
    achievements = cachedList('achievements', Achievement.fromJson);
    projects = cachedList('projects', ProjectItem.fromJson);
    faqs = cachedList('faqs', FaqItem.fromJson)..sort((a, b) => a.order.compareTo(b.order));
    sponsors = cachedList('sponsors', Sponsor.fromJson)..sort((a, b) => a.order.compareTo(b.order));
    advisors = cachedList('advisors', Advisor.fromJson).where((a) => a.active).toList()..sort((a, b) => a.order.compareTo(b.order));
    weeklySessions = cachedList('weekly_sessions', WeeklySession.fromJson).where((s) => s.active).toList()..sort((a, b) => a.order.compareTo(b.order));
    testimonials = cachedList('testimonials', (m) => m).where((r) => r['active'] != false).toList();
    final st = _readCache('settings');
    if (st is Map) settings = SiteSettings.fromJson(Map<String, dynamic>.from(st));
    loading = false;
  }

  /// Asks the server who this login is now (a role can have changed since the last visit) and ends a session
  /// the server no longer accepts.
  Future<void> _refreshAdmin() async {
    try {
      final me = await api.authGet('/auth/me');
      adminName = (me['username'] ?? adminName)?.toString();
      final role = me['role']?.toString();
      if (role != null && role.isNotEmpty) adminRole = role;
      await _prefs?.setString('admin', adminName ?? '');
      await _prefs?.setString('admin_role', adminRole ?? '');
      notifyListeners();
    } on ApiException catch (e) {
      if (e.status == 401) await logout();
    }
  }

  bool isDark(BuildContext context) => themeMode == ThemeMode.dark || (themeMode == ThemeMode.system && MediaQuery.platformBrightnessOf(context) == Brightness.dark);

  /// light -> dark -> automatic (follows the phone setting) -> light
  void toggleTheme() {
    themeMode = switch (themeMode) {
      ThemeMode.light => ThemeMode.dark,
      ThemeMode.dark => ThemeMode.system,
      ThemeMode.system => ThemeMode.light,
    };
    _prefs?.setString('theme', themeMode == ThemeMode.dark ? 'dark' : themeMode == ThemeMode.system ? 'system' : 'light');
    notifyListeners();
  }

  void toggleAdminTheme() {
    adminDark = !adminDark;
    _prefs?.setBool('admin_dark', adminDark);
    notifyListeners();
  }

  Future<List<T>> _fetch<T>(String table, T Function(Map<String, dynamic>) map, {bool fresh = false}) async {
    List<Map<String, dynamic>> rows;
    try {
      rows = await api.list(table, fresh: fresh);
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

  Future<Map<String, dynamic>> _fetchSettings({bool fresh = false}) async {
    try {
      final data = await api.settings(fresh: fresh);
      await _prefs?.setString('cache_settings', jsonEncode(data));
      return data;
    } catch (_) {
      final cached = _readCache('settings');
      if (cached is! Map) rethrow;
      _usedCache = true;
      return Map<String, dynamic>.from(cached);
    }
  }

  Future<void>? _loadingNow;

  /// Loads the public content once, whoever opens the app first: the splash, a shared deep
  /// link (#/team) or the admin area. A running load is reused, and a finished one is not
  /// started again — screens can call this freely.
  Future<void> ensureLoaded({bool fresh = false}) {
    if (loadedOnce) return Future<void>.value();
    // Screens call this from initState; loadAll() sets `loading` and notifies straight away, which
    // would mark the provider dirty while it is still mounting. Start on the next microtask instead.
    return _loadingNow ??= Future<void>.microtask(() => loadAll(fresh: fresh)).whenComplete(() => _loadingNow = null);
  }

  Future<void> loadAll({bool fresh = true}) async {
    final hasData = events.isNotEmpty || members.isNotEmpty;
    if (!hasData) {
      loading = true;
      notifyListeners();
    }
    error = null;
    _usedCache = false;
    String? firstError;
    Future<void> guard(Future<void> Function() fn) async {
      try {
        await fn();
      } catch (e) {
        firstError ??= e.toString();
      }
    }

    // fast path: one request for everything; if it fails (older server, no network) the lists are fetched one by one, then from the saved copy
    Map<String, dynamic>? all;
    try {
      all = await api.bootstrap(fresh: fresh);
      if (all['events'] is! List || all['members'] is! List) all = null;
    } catch (_) {
      all = null;
    }
    if (all != null) {
      final boot = all;
      List<T> rows<T>(String key, T Function(Map<String, dynamic>) map) {
        final v = boot[key];
        final list = v is List ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : <Map<String, dynamic>>[];
        _prefs?.setString('cache_$key', jsonEncode(list));
        return list.map(map).toList();
      }

      events = rows('events', EventItem.fromJson);
      notices = rows('notices', NoticeItem.fromJson);
      members = rows('members', Member.fromJson);
      gallery = rows('gallery', GalleryItem.fromJson);
      achievements = rows('achievements', Achievement.fromJson);
      projects = rows('projects', ProjectItem.fromJson);
      faqs = rows('faqs', FaqItem.fromJson)..sort((a, b) => a.order.compareTo(b.order));
      sponsors = rows('sponsors', Sponsor.fromJson)..sort((a, b) => a.order.compareTo(b.order));
      advisors = rows('advisors', Advisor.fromJson).where((a) => a.active).toList()..sort((a, b) => a.order.compareTo(b.order));
      weeklySessions = rows('weekly_sessions', WeeklySession.fromJson).where((s) => s.active).toList()..sort((a, b) => a.order.compareTo(b.order));
      testimonials = rows('testimonials', (m) => m).where((r) => r['active'] != false).toList();
      final st = boot['settings'];
      if (st is Map) {
        final map = Map<String, dynamic>.from(st);
        _prefs?.setString('cache_settings', jsonEncode(map));
        settings = SiteSettings.fromJson(map);
      } else {
        await guard(() async => settings = SiteSettings.fromJson(await _fetchSettings(fresh: fresh)));
      }
      error = firstError;
      offline = false;
      loading = false;
      loadedOnce = true;
      notifyListeners();
      return;
    }

    await Future.wait([
      guard(() async => events = await _fetch('events', EventItem.fromJson, fresh: fresh)),
      guard(() async => notices = await _fetch('notices', NoticeItem.fromJson, fresh: fresh)),
      guard(() async => members = await _fetch('members', Member.fromJson, fresh: fresh)),
      guard(() async => gallery = await _fetch('gallery', GalleryItem.fromJson, fresh: fresh)),
      guard(() async => achievements = await _fetch('achievements', Achievement.fromJson, fresh: fresh)),
      guard(() async => projects = await _fetch('projects', ProjectItem.fromJson, fresh: fresh)),
      guard(() async => faqs = (await _fetch('faqs', FaqItem.fromJson, fresh: fresh))..sort((a, b) => a.order.compareTo(b.order))),
      guard(() async => sponsors = (await _fetch('sponsors', Sponsor.fromJson, fresh: fresh))..sort((a, b) => a.order.compareTo(b.order))),
      guard(() async => advisors = (await _fetch('advisors', Advisor.fromJson, fresh: fresh)).where((a) => a.active).toList()..sort((a, b) => a.order.compareTo(b.order))),
      guard(() async => weeklySessions = (await _fetch('weekly_sessions', WeeklySession.fromJson, fresh: fresh)).where((s) => s.active).toList()..sort((a, b) => a.order.compareTo(b.order))),
      () async {
        try {
          testimonials = (await _fetch('testimonials', (m) => m, fresh: fresh)).where((r) => r['active'] != false).toList();
        } catch (_) {}
      }(),
      guard(() async => settings = SiteSettings.fromJson(await _fetchSettings(fresh: fresh))),
    ]);
    error = firstError;
    offline = _usedCache;
    loading = false;
    loadedOnce = true;
    notifyListeners();
  }

  int _dataVersion = 0;

  /// Ask the shared data version; when an admin saved anything (here or on another device) the public
  /// lists are fetched again quietly, so the app never keeps showing yesterday's content.
  Future<void> checkForUpdates() async {
    int v;
    try {
      v = await api.dataVersion();
    } catch (_) {
      return;
    }
    if (_dataVersion == 0) {
      _dataVersion = v; // first look: the screen already loaded its data
      return;
    }
    if (v == _dataVersion) return;
    _dataVersion = v;
    try {
      await loadAll(fresh: true);
    } catch (_) {
      // keep what is on screen; the next check tries again
    }
  }

  Future<void> reloadMembers() async {
    try {
      members = await _fetch('members', Member.fromJson, fresh: true);
      notifyListeners();
    } catch (_) {}
  }

  // ---- derived ----
  /// Committee members only (ambassadors are listed on their own screen).
  List<Member> get teamMembers => members.where((m) => !m.isAmbassador).toList();

  List<Member> get ambassadors => members.where((m) => m.isAmbassador).toList();

  /// Newest committee session name, or null.
  String? get latestSession {
    final s = teamMembers.map((m) => m.session).where((x) => x.isNotEmpty).toSet().toList()
      ..sort((a, b) => sessionRank(b).compareTo(sessionRank(a)));
    return s.isEmpty ? null : s.first;
  }

  /// Leaders, then core (Secretary/Treasurer...), then chiefs of the latest session; max 10 with photos.
  List<Member> get featuredCommittee {
    final session = latestSession;
    if (session == null) return [];
    List<Member> pick(bool Function(Member) t) =>
        teamMembers.where((m) => m.session == session && m.imageUrl.isNotEmpty && t(m)).toList()..sort((a, b) => a.order.compareTo(b.order));
    return [...pick((m) => m.isLeader), ...pick((m) => m.isCore), ...pick((m) => m.isChief)].take(10).toList();
  }

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
  Future<void> login(String username, String password, {String? code, void Function(String)? onStage}) async {
    onStage?.call('Asking the server…');
    final res = await api.login(username, password, code: code);
    onStage?.call('Password accepted. Checking the session…');
    final token = (res['token'] ?? '').toString();
    if (token.isEmpty) throw ApiException('Login failed');
    api.token = token;
    // the very next request must work too; if the server refuses the session, say so here instead of bouncing back to this screen
    Map<String, dynamic>? me;
    try {
      final r = await api.adminCall('GET', '/auth/me', query: {'_': DateTime.now().millisecondsSinceEpoch});
      if (r is Map) me = Map<String, dynamic>.from(r);
    } on ApiException catch (e) {
      api.token = null;
      throw ApiException('You typed the right details, but the server did not accept the session (${e.status ?? 'no answer'}): ${e.message}');
    }
    onStage?.call('Signed in. Opening the admin area…');
    final user = res['user'];
    adminName = (me?['username'] ?? (user is Map ? user['username'] : null) ?? username).toString();
    final role = me?['role'] ?? (user is Map ? user['role'] : null);
    if (role != null && role.toString().isNotEmpty) adminRole = role.toString();
    await _prefs?.setString('token', token);
    await _prefs?.setString('admin', adminName ?? '');
    await _prefs?.setString('admin_role', adminRole ?? '');
    notifyListeners();
  }

  /// After "sign out everywhere" the server hands back a fresh token for this device.
  Future<void> replaceToken(String token) async {
    if (token.isEmpty) return;
    api.token = token;
    await _prefs?.setString('token', token);
    notifyListeners();
  }

  Future<void> logout() async {
    api.token = null;
    adminName = null;
    adminRole = null;
    await _prefs?.remove('token');
    await _prefs?.remove('admin');
    await _prefs?.remove('admin_role');
    notifyListeners();
  }

  /// Called when an admin request returns 401/403 (expired token).
  Future<void> handleAuthError(Object e) async {
    // 401 means the session is gone. A 403 is the server saying "your login may not do this" (an editor
    // pressing delete, a main-admin-only page): that must show its message, never sign the person out.
    if (e is ApiException && e.status == 401) {
      signOutNote = e.message; // shown once on the sign-in screen, so a sign-out is never silent
      await logout();
    }
  }

  /// Why the last admin session ended by itself (an expired or refused token); the sign-in screen shows it once.
  String? signOutNote;
}
