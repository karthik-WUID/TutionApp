import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'classroom.dart';

void main() => runApp(const SmartTutorApp());

class SmartTutorApp extends StatelessWidget {
  const SmartTutorApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Smart tutor',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff205b4b)),
      scaffoldBackgroundColor: const Color(0xfff7f8f3),
      useMaterial3: true,
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
      ),
    ),
    home: const ClassroomConnection(),
  );
}

class ClassroomConnection extends StatefulWidget {
  const ClassroomConnection({super.key});

  @override
  State<ClassroomConnection> createState() => _ClassroomConnectionState();
}

class _ClassroomConnectionState extends State<ClassroomConnection> {
  static const configuredAddress = String.fromEnvironment('CLASSROOM_URL');
  final _address = TextEditingController();
  final _form = GlobalKey<FormState>();
  bool _busy = false;
  String? _error;
  Uri? _connected;

  @override
  void initState() {
    super.initState();
    unawaited(_restore());
  }

  Future<void> _restore() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      if (!mounted) return;
      _address.text =
          preferences.getString('classroom_address') ?? configuredAddress;
      if (_address.text.isNotEmpty) await _connect();
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Your saved classroom could not be restored. Please enter its address again.',
        );
      }
    }
  }

  Future<void> _connect() async {
    if (_busy) return;
    Uri origin;
    try {
      origin = classroomAddress(_address.text, allowLocalHttp: kDebugMode);
    } on FormatException catch (e) {
      setState(() => _error = e.message);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await checkClassroom(origin);
      final preferences = await SharedPreferences.getInstance();
      await preferences.setString('classroom_address', origin.toString());
      if (mounted) setState(() => _connected = origin);
    } on FormatException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'We couldn’t reach your classroom. Check your internet connection and classroom address.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _address.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_connected case final origin?) {
      return ClassroomView(
        origin: origin,
        onSettings: () => setState(() => _connected = null),
      );
    }
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: const Color(0xff205b4b),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(
                        Icons.auto_awesome,
                        size: 38,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text(
                      'Smart tutor',
                      style: Theme.of(context).textTheme.headlineLarge
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'A little curious. A lot of potential.',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Connect to your classroom to learn, ask doubts, practise languages, and keep your work together.',
                    ),
                    const SizedBox(height: 28),
                    TextFormField(
                      controller: _address,
                      enabled: !_busy,
                      autocorrect: false,
                      keyboardType: TextInputType.url,
                      textInputAction: TextInputAction.go,
                      decoration: const InputDecoration(
                        labelText: 'Classroom address',
                        hintText: 'https://classroom.example.com',
                        helperText: 'Ask your tutor for the classroom link.',
                      ),
                      validator: (value) {
                        try {
                          classroomAddress(
                            value ?? '',
                            allowLocalHttp: kDebugMode,
                          );
                          return null;
                        } on FormatException catch (e) {
                          return e.message;
                        }
                      },
                      onFieldSubmitted: (_) {
                        if (_form.currentState!.validate()) {
                          unawaited(_connect());
                        }
                      },
                    ),
                    const SizedBox(height: 18),
                    if (_error != null) ...[
                      Semantics(
                        liveRegion: true,
                        child: Text(
                          _error!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                    ],
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _busy
                            ? null
                            : () {
                                if (_form.currentState!.validate()) {
                                  unawaited(_connect());
                                }
                              },
                        icon: _busy
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.arrow_forward),
                        label: Text(
                          _busy ? 'Connecting…' : 'Open my classroom',
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),
                    const Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Chip(
                          avatar: Icon(Icons.menu_book, size: 17),
                          label: Text('Classes 1–12'),
                        ),
                        Chip(
                          avatar: Icon(Icons.language, size: 17),
                          label: Text('8 languages'),
                        ),
                        Chip(
                          avatar: Icon(Icons.edit_note, size: 17),
                          label: Text('Homework & projects'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class ClassroomView extends StatefulWidget {
  const ClassroomView({
    super.key,
    required this.origin,
    required this.onSettings,
  });
  final Uri origin;
  final VoidCallback onSettings;

  @override
  State<ClassroomView> createState() => _ClassroomViewState();
}

class _ClassroomViewState extends State<ClassroomView> {
  late final WebViewController _controller;
  int _progress = 0;
  bool _canGoBack = false;
  String? _failure;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xfff7f8f3))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (value) {
            if (mounted) setState(() => _progress = value);
          },
          onPageStarted: (_) {
            if (mounted) setState(() => _failure = null);
          },
          onPageFinished: (_) async {
            final canGoBack = await _controller.canGoBack();
            if (mounted) setState(() => _canGoBack = canGoBack);
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == true && mounted) {
              setState(
                () => _failure =
                    'Your classroom couldn’t load. Check your connection, then try again.',
              );
            }
          },
          onNavigationRequest: (request) {
            final destination = Uri.tryParse(request.url);
            if (destination != null &&
                destination.hasAuthority &&
                (destination.scheme == 'http' ||
                    destination.scheme == 'https') &&
                destination.origin == widget.origin.origin) {
              return NavigationDecision.navigate;
            }
            if (destination != null && destination.scheme == 'https') {
              unawaited(_openExternal(destination));
            }
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(widget.origin);
  }

  Future<void> _openExternal(Uri address) async {
    try {
      if (await launchUrl(address, mode: LaunchMode.externalApplication)) {
        return;
      }
    } catch (_) {
      /* Show the same actionable fallback below. */
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'This link couldn’t open. Please try again from your browser.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_canGoBack,
    onPopInvokedWithResult: (didPop, _) async {
      if (!didPop && await _controller.canGoBack()) {
        await _controller.goBack();
        final canGoBack = await _controller.canGoBack();
        if (mounted) setState(() => _canGoBack = canGoBack);
      }
    },
    child: Scaffold(
      appBar: AppBar(
        title: const Text('Smart tutor'),
        actions: [
          IconButton(
            tooltip: 'Refresh classroom',
            onPressed: () => unawaited(_controller.reload()),
            icon: const Icon(Icons.refresh),
          ),
          PopupMenuButton<String>(
            tooltip: 'Classroom options',
            onSelected: (choice) {
              if (choice == 'browser') unawaited(_openExternal(widget.origin));
              if (choice == 'settings') widget.onSettings();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'browser', child: Text('Open in browser')),
              PopupMenuItem(
                value: 'settings',
                child: Text('Classroom address'),
              ),
            ],
          ),
        ],
        bottom: _progress < 100
            ? PreferredSize(
                preferredSize: const Size.fromHeight(3),
                child: LinearProgressIndicator(value: _progress / 100),
              )
            : null,
      ),
      body: SafeArea(
        child: _failure == null
            ? WebViewWidget(controller: _controller)
            : Center(
                child: Padding(
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off, size: 42),
                      const SizedBox(height: 18),
                      Text(_failure!, textAlign: TextAlign.center),
                      const SizedBox(height: 18),
                      FilledButton(
                        onPressed: () {
                          setState(() => _failure = null);
                          unawaited(_controller.loadRequest(widget.origin));
                        },
                        child: const Text('Try again'),
                      ),
                      TextButton(
                        onPressed: widget.onSettings,
                        child: const Text('Check classroom address'),
                      ),
                    ],
                  ),
                ),
              ),
      ),
    ),
  );
}
