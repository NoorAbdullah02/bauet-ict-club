import 'package:dio/dio.dart';

import '../core/config.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.status, this.fields = const {}});
  final String message;
  final int? status;
  final Map<String, String> fields;

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

  Future<void> submitRegistration(Map<String, dynamic> body) => _send(() => _dio.post('/registrations', data: body));

  // ---- admin ----
  Future<Map<String, dynamic>> login(String username, String password) async {
    final data = await _send(() => _dio.post('/auth/login', data: {'username': username, 'password': password}));
    return data is Map ? Map<String, dynamic>.from(data) : {};
  }

  Future<void> create(String table, Map<String, dynamic> body) => _send(() => _dio.post('/$table', data: body, options: _auth));

  Future<void> update(String table, int id, Map<String, dynamic> body) =>
      _send(() => _dio.put('/$table/$id', data: body, options: _auth));

  Future<void> remove(String table, int id) => _send(() => _dio.delete('/$table/$id', options: _auth));

  Future<void> setRegistrationStatus(int id, String status) =>
      _send(() => _dio.patch('/registrations/$id/status', data: {'status': status}, options: _auth));

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
}
