import 'dart:convert';

import 'package:http/http.dart' as http;

import 'task.dart';

/// Error with a message that is safe to show to the user.
class ApiException implements Exception {
  /// Creates an API exception.
  const ApiException(this.message, {this.unauthorized = false});

  /// User-facing message (never contains tokens or server internals).
  final String message;

  /// True when the session is no longer valid (HTTP 401).
  final bool unauthorized;

  @override
  String toString() => message;
}

/// Thin client for the Task Manager REST API.
///
/// The [http.Client] is injectable so tests can pass a `MockClient`.
class TaskApiClient {
  /// Creates a client for [baseUrl], e.g. `http://localhost:3000`.
  TaskApiClient({required this.baseUrl, http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  /// API origin without trailing slash.
  final String baseUrl;
  final http.Client _http;

  String? _accessToken;
  String? _refreshToken;

  /// Whether the client currently holds a session.
  bool get isSignedIn => _accessToken != null;

  Uri _uri(String path) => Uri.parse('$baseUrl/api/v1$path');

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
      };

  /// Signs in and stores the token pair in memory.
  ///
  /// In a real app, store the refresh token with platform secure storage.
  Future<void> login(String email, String password) async {
    final res = await _http.post(
      _uri('/auth/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode == 401) {
      throw const ApiException('Invalid email or password.');
    }
    if (res.statusCode == 429) {
      throw const ApiException('Too many attempts. Try again later.');
    }
    if (res.statusCode != 200) {
      throw const ApiException('Could not sign in.');
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    _accessToken = body['accessToken'] as String?;
    _refreshToken = body['refreshToken'] as String?;
  }

  /// Loads the signed-in user's tasks.
  Future<List<Task>> listTasks() async {
    final res = await _http.get(_uri('/tasks'), headers: _headers);
    _throwIfError(res, 'Could not load tasks.');
    try {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final items = body['items'] as List<dynamic>;
      return [for (final item in items) Task.fromJson(item as Map<String, dynamic>)];
    } on Object {
      throw const ApiException('Could not load tasks.');
    }
  }

  /// Creates a task and returns it.
  Future<Task> createTask(String title) async {
    final res = await _http.post(
      _uri('/tasks'),
      headers: _headers,
      body: jsonEncode({'title': title}),
    );
    if (res.statusCode == 400) throw const ApiException('Enter a valid title.');
    _throwIfError(res, 'Could not save the task.');
    return Task.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  /// Marks a task complete or pending.
  Future<Task> setCompleted(String id, bool completed) async {
    final res = await _http.patch(
      _uri('/tasks/$id'),
      headers: _headers,
      body: jsonEncode({'completed': completed}),
    );
    _throwIfError(res, 'Could not update the task.');
    return Task.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  /// Revokes the refresh token on the server and forgets the session.
  Future<void> logout() async {
    final refresh = _refreshToken;
    _accessToken = null;
    _refreshToken = null;
    if (refresh == null) return;
    try {
      await _http.post(
        _uri('/auth/logout'),
        headers: _headers,
        body: jsonEncode({'refreshToken': refresh}),
      );
    } on Object {
      // Sin red: la sesión local ya se borró; el token expirará en el servidor.
    }
  }

  void _throwIfError(http.Response res, String message) {
    if (res.statusCode == 401) {
      throw const ApiException('Your session expired. Sign in again.', unauthorized: true);
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(message);
    }
  }
}
