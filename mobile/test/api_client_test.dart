// Sección 15 – Prueba del cliente API con MockClient (sin red).
// Lo que esta prueba NO puede detectar se documenta en docs/15-mocks-vs-integracion.md.
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:my_app/api_client.dart';

void main() {
  test('login stores the token and listTasks sends it', () async {
    final seen = <http.Request>[];
    final mock = MockClient((request) async {
      seen.add(request);
      if (request.url.path == '/api/v1/auth/login') {
        return http.Response(jsonEncode({'accessToken': 'TEST_ACCESS', 'refreshToken': 'TEST_REFRESH'}), 200);
      }
      return http.Response(
        jsonEncode({
          'items': [
            {'id': 'task-1', 'title': 'Plan tests', 'completed': false},
          ],
        }),
        200,
      );
    });
    final client = TaskApiClient(baseUrl: 'http://api.test', httpClient: mock);

    await client.login('tester@example.test', 'local-test-password');
    final tasks = await client.listTasks();

    expect(tasks.single.title, 'Plan tests');
    expect(seen.last.headers['Authorization'], 'Bearer TEST_ACCESS');
  });

  test('401 is reported as an expired session', () async {
    final client = TaskApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((_) async => http.Response('{}', 401)),
    );
    await expectLater(
      client.listTasks(),
      throwsA(isA<ApiException>().having((e) => e.unauthorized, 'unauthorized', isTrue)),
    );
  });

  test('malformed task data becomes a safe error, not a crash', () async {
    final client = TaskApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((_) async => http.Response(
            jsonEncode({
              'items': [
                {'title': 'no id'},
              ],
            }),
            200,
          )),
    );
    await expectLater(
      client.listTasks(),
      throwsA(isA<ApiException>().having((e) => e.message, 'message', 'Could not load tasks.')),
    );
  });

  test('logout clears the session even if the network fails', () async {
    var calls = 0;
    final client = TaskApiClient(
      baseUrl: 'http://api.test',
      httpClient: MockClient((request) async {
        calls++;
        if (request.url.path.endsWith('/login')) {
          return http.Response(jsonEncode({'accessToken': 'a', 'refreshToken': 'r'}), 200);
        }
        throw http.ClientException('offline');
      }),
    );
    await client.login('tester@example.test', 'local-test-password');
    await client.logout();

    expect(client.isSignedIn, isFalse);
    expect(calls, 2);
  });
}
