import 'dart:convert';
import 'dart:io';

/// The current web classroom and its API are both served from this origin.
Uri classroomAddress(String input, {bool allowLocalHttp = false}) {
  final value = input.trim();
  final uri = Uri.tryParse(value);
  if (uri == null ||
      !uri.hasAuthority ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty ||
      uri.hasQuery ||
      uri.hasFragment ||
      (uri.path.isNotEmpty && uri.path != '/')) {
    throw const FormatException(
      'Enter the full classroom address, starting with https://.',
    );
  }
  final privateHost = _isLocalHost(uri.host);
  if (uri.scheme != 'https' &&
      !(allowLocalHttp && uri.scheme == 'http' && privateHost)) {
    throw const FormatException('Use an HTTPS classroom address.');
  }
  // Evaluating port validates its numeric range too.
  if (uri.port < 1 || uri.port > 65535) {
    throw const FormatException('The classroom address has an invalid port.');
  }
  return uri.replace(path: '/');
}

bool _isLocalHost(String host) {
  if (host == 'localhost' || host == '::1') return true;
  final parts = host.split('.').map(int.tryParse).toList();
  if (parts.length != 4 || parts.any((p) => p == null || p < 0 || p > 255)) {
    return false;
  }
  final a = parts[0]!, b = parts[1]!;
  return a == 127 ||
      a == 10 ||
      (a == 192 && b == 168) ||
      (a == 172 && b >= 16 && b <= 31);
}

Future<void> checkClassroom(Uri origin) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 10);
  try {
    final request = await client
        .getUrl(origin.resolve('/api/health'))
        .timeout(const Duration(seconds: 10));
    // Do not follow a classroom health check to an unrelated origin or HTTP URL.
    request.followRedirects = false;
    final response = await request.close().timeout(const Duration(seconds: 10));
    if (response.statusCode != HttpStatus.ok) {
      throw const FormatException(
        'This classroom is unavailable. Check the address or try again.',
      );
    }
    final bytes = <int>[];
    await for (final chunk in response.timeout(const Duration(seconds: 10))) {
      bytes.addAll(chunk);
      if (bytes.length > 8192) {
        throw const FormatException(
          'This address is not a Smart tutor classroom.',
        );
      }
    }
    dynamic payload;
    try {
      payload = jsonDecode(utf8.decode(bytes));
    } on FormatException {
      throw const FormatException(
        'This address is not a Smart tutor classroom.',
      );
    }
    if (payload is! Map ||
        payload['status'] != 'ok' ||
        payload['app'] != 'Smart tutor') {
      throw const FormatException(
        'This address is not a Smart tutor classroom.',
      );
    }
  } finally {
    client.close(force: true);
  }
}
