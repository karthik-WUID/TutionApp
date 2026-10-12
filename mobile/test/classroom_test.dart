import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_tutor_android/classroom.dart';

void main() {
  test(
    'accepts an HTTPS classroom origin and rejects unsafe or incomplete addresses',
    () {
      expect(
        classroomAddress(' https://tutor.example.com ').toString(),
        'https://tutor.example.com/',
      );
      for (final value in [
        'tutor.example.com',
        'javascript:alert(1)',
        'http://tutor.example.com',
        'https://user:password@tutor.example.com',
        'https://tutor.example.com/private',
        'https://tutor.example.com/?token=secret',
      ]) {
        expect(
          () => classroomAddress(value),
          throwsFormatException,
          reason: value,
        );
      }
    },
  );
  test('allows local development HTTP only when explicitly enabled', () {
    for (final host in ['127.0.0.1', 'localhost', '10.0.2.2', '192.168.1.20']) {
      expect(
        classroomAddress('http://$host:3001', allowLocalHttp: true).port,
        3001,
      );
      expect(
        () => classroomAddress('http://$host:3001'),
        throwsFormatException,
      );
    }
    expect(
      () => classroomAddress('http://public.example.com', allowLocalHttp: true),
      throwsFormatException,
    );
  });
  test(
    'verifies the actual classroom health response before saving a connection',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      var response = '{"status":"ok","app":"Smart tutor"}';
      final listener = server.listen((request) {
        expect(request.uri.path, '/api/health');
        request.response.headers.contentType = ContentType.json;
        request.response.write(response);
        request.response.close();
      });
      final origin = Uri.parse('http://127.0.0.1:${server.port}');
      try {
        await checkClassroom(origin);
        response = '{"status":"ok","app":"Another app"}';
        await expectLater(checkClassroom(origin), throwsFormatException);
        response = 'not JSON';
        await expectLater(checkClassroom(origin), throwsFormatException);
      } finally {
        await server.close(force: true);
        await listener.cancel();
      }
    },
  );
}
