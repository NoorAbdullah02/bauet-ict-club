import 'package:dio/dio.dart';

import '../core/config.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.status, this.fields = const {}});
  final String message;
  final int? status;
  final Map<String, String> fields;

  /// True when the server wants the 6-digit authenticator code (or a backup code) to finish signing in.
  bool get needsCode => status == 401 && message.contains('code');

  @override
  String toString() => message;
}

/// Thin wrapper around Dio for the club's Express API.
class Api {
  Api()
      : _dio = Dio(BaseOptions(
          baseUrl: AppConfig.baseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 45),
          sendTimeout: const Duration(seconds: 45),
          headers: {'Accept': 'application/json'},
        ));

  final Dio _dio;
  String? token;

  Options? get _auth => token == null ? null : Options(headers: {'Authorization': 'Bearer $token'});

  ApiException _wrap(DioException e) {
    final data = e.response?.data;
    if (data is Map) {
      final fields = <String, String>{};
      if (data['fields'] is Map) {
        (data['fields'] as Map).forEach((k, v) => fields[k.toString()] = v.toString());
      }
      return ApiException(
        (data['error'] ?? data['message'] ?? 'Request failed').toString(),
        status: e.response?.statusCode,
        fields: fields,
      );
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return ApiException('Cannot reach the server. Check your connection.');
      default:
        return ApiException(e.message ?? 'Something went wrong', status: e.response?.statusCode);
    }
  }

  Future<dynamic> _send(Future<Response<dynamic>> Function() call) async {
    try {
      final r = await call();
      return r.data;
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  // ---- public reads ----
  /// [fresh] bypasses the server's 30s public list cache (admin screens, pull-to-refresh).
  Future<List<Map<String, dynamic>>> list(String table, {bool fresh = false}) async {
    final data = await _send(() => _dio.get(
          '/$table',
          queryParameters: fresh ? {'_': DateTime.now().millisecondsSinceEpoch} : null,
          options: fresh
              ? Options(headers: {'Cache-Control': 'no-cache', 'Pragma': 'no-cache', if (token != null) 'Authorization': 'Bearer $token'})
              : _auth,
        ));
    if (data is! List) return [];
    return data.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<Map<String, dynamic>> settings({bool fresh = false}) async {
    final data = await _send(() => _dio.get(
          '/settings',
          queryParameters: fresh ? {'_': DateTime.now().millisecondsSinceEpoch} : null,
          options: fresh ? Options(headers: {'Cache-Control': 'no-cache'}) : null,
        ));
    return data is Map ? Map<String, dynamic>.from(data) : {};
  }

  // ---- public writes ----
  Future<void> sendMessage(Map<String, dynamic> body) => _send(() => _dio.post('/messages', data: body));

  Future<String> chat(String message, List<Map<String, String>> history) async {
    final data = await _send(() => _dio.post('/chat', data: {'message': message, 'history': history}));
    return data is Map ? (data['reply'] ?? '').toString() : '';
  }

  Future<String> uploadPhoto(String path, String filename, String mime) async {
    final form = FormData.fromMap({
      'photo': await MultipartFile.fromFile(path, filename: filename, contentType: DioMediaType.parse(mime)),
    });
    final data = await _send(() => _dio.post('/registrations/photo', data: form));
    final url = data is Map ? (data['url'] ?? '').toString() : '';
    if (url.isEmpty) throw ApiException('Photo upload failed');
    return url;
  }

  /// Admin picture upload (any section). `kind` is avatar, cover or logo and picks the server-side crop.
  Future<String> uploadAdminImage(String path, String filename, String mime, {String kind = 'cover'}) async {
    final form = FormData.fromMap({
      'image': await MultipartFile.fromFile(path, filename: filename, contentType: DioMediaType.parse(mime)),
    });
    final data = await _send(() => _dio.post('/upload', queryParameters: {'kind': kind}, data: form, options: _auth));
    final url = data is Map ? (data['url'] ?? '').toString() : '';
    if (url.isEmpty) throw ApiException('Image upload failed');
    return url;
  }

  /// Email the applications export (PDF or Word) to the admin address, or to `to`. Body: format, type, status, q, ids, to.
  Future<Map<String, dynamic>> emailApplicationsExport(Map<String, dynamic> body) async {
    final data = await _send(() => _dio.post('/registrations/export/email', data: body, options: _auth));
    return data is Map ? Map<String, dynamic>.from(data) : {};
  }

  /// Connection status for admin Settings: path is email/status, chat/status or upload/status.
  Future<Map<String, dynamic>> serviceStatus(String path) async {
    final data = await _send(() => _dio.get('/$path', options: _auth));
    return data is Map ? Map<String, dynamic>.from(data) : {};
  }

  /// Newsletter signup. Throws ApiException (400 invalid email, 429 rate limited).
  Future<void> subscribe(String email) => _send(() => _dio.post('/subscribers', data: {'email': email}));

  Future<void> submitRegistration(Map<String, dynamic> body) => _send(() => _dio.post('/registrations', data: body));

  // ---- admin ----
  Future<Map<String, dynamic>> login(String username, String password, {String? code}) async {
    final data = await _send(() => _dio.post('/auth/login', data: {'username': username, 'password': password, if (code != null && code.isNotEmpty) 'code': code}));
    return data is Map ? Map<String, dynamic>.from(data) : {};
  }

  /// Same as create, but returns the new row (its id is needed to carry on, for example to its sign-up form).
  Future<Map<String, dynamic>> createReturning(String table, Map<String, dynamic> body) async => _map(await _send(() => _dio.post('/$table', data: body, options: _auth)));

  Future<void> create(String table, Map<String, dynamic> body) => _send(() => _dio.post('/$table', data: body, options: _auth));

  Future<void> update(String table, int id, Map<String, dynamic> body) =>
      _send(() => _dio.put('/$table/$id', data: body, options: _auth));

  Future<void> remove(String table, int id) => _send(() => _dio.delete('/$table/$id', options: _auth));

  Future<void> setRegistrationStatus(int id, String status) =>
      _send(() => _dio.patch('/registrations/$id/status', data: {'status': status}, options: _auth));

  Future<void> setRegistrationPost(int id, String post) =>
      _send(() => _dio.patch('/registrations/$id/post', data: {'post': post}, options: _auth));

  Future<void> selectRegistration(int id, String session, String position, int order) => _send(() => _dio.post(
        '/registrations/$id/select',
        data: {'session': session, 'position': position, 'display_order': order},
        options: _auth,
      ));

  Future<void> deleteRegistration(int id) => _send(() => _dio.delete('/registrations/$id', options: _auth));

  // ---- trash ----
  Future<Map<String, dynamic>> trash() async {
    final data = await _send(() => _dio.get('/trash', queryParameters: {'_': DateTime.now().millisecondsSinceEpoch}, options: Options(headers: {'Cache-Control': 'no-cache', if (token != null) 'Authorization': 'Bearer $token'})));
    return data is Map ? Map<String, dynamic>.from(data) : {};
  }

  Future<void> restoreTrash(String type, int id) => _send(() => _dio.post('/trash/$type/$id/restore', options: _auth));

  Future<void> purgeTrash(String type, int id) => _send(() => _dio.delete('/trash/$type/$id', options: _auth));

  Future<void> emptyTrash() => _send(() => _dio.delete('/trash', options: _auth));

  // ---- committees ----
  Future<List<Map<String, dynamic>>> committees() async {
    final data = await _send(() => _dio.get('/committees', queryParameters: {'_': DateTime.now().millisecondsSinceEpoch}, options: Options(headers: {'Cache-Control': 'no-cache', if (token != null) 'Authorization': 'Bearer $token'})));
    if (data is! List) return [];
    return data.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<void> launchCommittee(String session, String? copyFrom, String scope) => _send(() => _dio.post(
        '/committees/launch',
        data: {'session': session, 'copyFrom': copyFrom ?? '', 'scope': scope},
        options: _auth,
      ));

  // ---- demo data ----
  Future<int> demoCount() async {
    final data = await _send(() => _dio.get('/committees/demo', queryParameters: {'_': DateTime.now().millisecondsSinceEpoch}, options: Options(headers: {'Cache-Control': 'no-cache', if (token != null) 'Authorization': 'Bearer $token'})));
    return data is Map ? (int.tryParse(data['count'].toString()) ?? 0) : 0;
  }

  Future<void> loadDemo() => _send(() => _dio.post('/committees/demo', options: _auth));

  Future<void> removeDemo() => _send(() => _dio.delete('/committees/demo', options: _auth));

  // ---- event registration, tickets, public forms ----
  Map<String, dynamic> _map(dynamic d) => d is Map ? Map<String, dynamic>.from(d) : <String, dynamic>{};

  Future<Map<String, dynamic>> event(int id) async => _map(await _send(() => _dio.get('/events/$id')));

  /// Seats taken per event id (waiting list not counted).
  Future<Map<String, int>> eventCounts() async {
    final d = await _send(() => _dio.get('/event-registrations/counts'));
    final out = <String, int>{};
    if (d is Map) d.forEach((k, v) => out[k.toString()] = int.tryParse(v.toString()) ?? 0);
    return out;
  }

  /// Sign up for an event. Returns { ticket, waitlisted, position, pending_payment, message }.
  Future<Map<String, dynamic>> registerForEvent(int eventId, Map<String, dynamic> body) async =>
      _map(await _send(() => _dio.post('/event-registrations/$eventId', data: body)));

  Future<Map<String, dynamic>> ticket(String code) async =>
      _map(await _send(() => _dio.get('/event-registrations/ticket/${Uri.encodeComponent(code)}', options: Options(headers: {'Cache-Control': 'no-cache'}))));

  Future<void> cancelTicket(String code) => _send(() => _dio.post('/event-registrations/ticket/${Uri.encodeComponent(code)}/cancel'));

  Future<Map<String, dynamic>> publicForm(String slug) async =>
      _map(await _send(() => _dio.get('/forms/public/${Uri.encodeComponent(slug)}')));

  Future<Map<String, dynamic>> submitPublicForm(String slug, Map<String, dynamic> body) async =>
      _map(await _send(() => _dio.post('/forms/public/${Uri.encodeComponent(slug)}', data: body)));

  // ---- admin: event sign-ups, payments, check-in ----
  Future<List<Map<String, dynamic>>> eventSignups(int eventId) async {
    final d = await _send(() => _dio.get('/event-registrations/by-event/$eventId',
        queryParameters: {'_': DateTime.now().millisecondsSinceEpoch}, options: Options(headers: {'Cache-Control': 'no-cache', if (token != null) 'Authorization': 'Bearer $token'})));
    if (d is! List) return [];
    return d.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  /// Check in by ticket code. Throws ApiException; `needs_confirm` is true when the payment is not verified yet.
  Future<Map<String, dynamic>> checkIn(String code, {int? eventId, bool force = false}) async =>
      _map(await _send(() => _dio.post('/event-registrations/checkin',
          data: {'code': code, if (eventId != null) 'event': eventId, if (force) 'force': true}, options: _auth)));

  Future<void> setSignupCheckin(int id, bool checked) =>
      _send(() => _dio.patch('/event-registrations/$id/checkin', data: {'checked': checked}, options: _auth));

  Future<void> setSignupPayment(int id, String status) =>
      _send(() => _dio.patch('/event-registrations/$id/payment', data: {'status': status}, options: _auth));

  Future<void> promoteSignup(int id) => _send(() => _dio.patch('/event-registrations/$id/promote', options: _auth));

  Future<void> deleteSignup(int id) => _send(() => _dio.delete('/event-registrations/$id', options: _auth));

  // ---- admin: sign-in security ----
  Future<Map<String, dynamic>> authGet(String path) async => _map(await _send(() => _dio.get(path, options: _auth)));

  Future<Map<String, dynamic>> authPost(String path, [Map<String, dynamic>? body]) async =>
      _map(await _send(() => _dio.post(path, data: body ?? {}, options: _auth)));

  /// Any admin call (activity log, team logins, forms, newsletter, links, committees...). Returns the decoded JSON.
  Future<dynamic> adminCall(String method, String path, {Object? data, Map<String, dynamic>? query}) => _send(() => _dio.request(
        path,
        data: data,
        queryParameters: query,
        options: Options(method: method, headers: {'Cache-Control': 'no-cache', if (token != null) 'Authorization': 'Bearer $token'}),
      ));

  Future<List<Map<String, dynamic>>> adminList(String path) async {
    final d = await adminCall('GET', path, query: {'_': DateTime.now().millisecondsSinceEpoch});
    if (d is! List) return [];
    return d.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  /// Public certificate check: { valid, name, event, date, issuedBy, code }.
  Future<Map<String, dynamic>> verifyCertificate(String code) async =>
      _map(await _send(() => _dio.get('/event-registrations/verify/${Uri.encodeComponent(code)}')));

  /// Saves a file the server makes (export, ZIP, backup) to [savePath]. Admin only.
  Future<void> downloadTo(String path, String savePath, {Map<String, dynamic>? query}) async {
    try {
      final r = await _dio.download(path, savePath, queryParameters: query, options: Options(headers: {if (token != null) 'Authorization': 'Bearer $token'}, receiveTimeout: const Duration(minutes: 3)));
      if (r.statusCode != null && r.statusCode! >= 400) throw ApiException('Download failed', status: r.statusCode);
    } on DioException catch (e) {
      throw _wrap(e);
    }
  }

  /// Site-wide search: [{type, id, title, sub, path}].
  Future<List<Map<String, dynamic>>> search(String q) async {
    final d = await _send(() => _dio.get('/search', queryParameters: {'q': q}));
    if (d is! List) return [];
    return d.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  /// A member's card: { member: {...}, code, verified }. Pass the scanned code [c] to check it.
  Future<Map<String, dynamic>> memberCard(int id, {String? c}) async =>
      _map(await _send(() => _dio.get('/card/$id', queryParameters: {if (c != null && c.isNotEmpty) 'c': c})));

  /// Points and badges: the public leaderboard, and the points of one ticket's owner.
  Future<Map<String, dynamic>> leaderboard() async => _map(await _send(() => _dio.get('/points/leaderboard')));
  Future<Map<String, dynamic>> pointsOfTicket(String code) async => _map(await _send(() => _dio.get('/points/me', queryParameters: {'ticket': code})));

  /// Is paying online (the payment gateway) set up on the server?
  Future<bool> gatewayOn() async {
    try {
      final d = await _send(() => _dio.get('/pay/status'));
      return d is Map && d['gateway'] == true;
    } on ApiException {
      return false;
    }
  }

  /// Where an online payment is: { status: waiting | paid | failed, ticket? }. The transaction id is the secret.
  Future<Map<String, dynamic>> payCheck(String tran) async =>
      _map(await _send(() => _dio.get('/pay/check/${Uri.encodeComponent(tran)}', options: Options(headers: {'Cache-Control': 'no-cache'}))));

  /// Where a short link (/s/code) points: '/f/name' or '/events/12', or null.
  Future<String?> resolveShort(String code) async {
    try {
      final r = await Dio(BaseOptions(connectTimeout: const Duration(seconds: 10), receiveTimeout: const Duration(seconds: 10), followRedirects: false, validateStatus: (s) => s != null && s < 400))
          .get('${AppConfig.origin}/s/${Uri.encodeComponent(code)}');
      final loc = r.headers.value('location');
      if (loc == null) return null;
      final u = Uri.tryParse(loc);
      return u == null ? null : (u.hasAuthority ? u.path : loc);
    } catch (_) {
      return null;
    }
  }
}
