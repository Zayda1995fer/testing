import 'package:flutter/material.dart';

import 'api_client.dart';
import 'task.dart';
import 'task_list_panel.dart';

/// API origin. Override per environment, e.g.
/// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000` (Android emulator).
const String apiBaseUrl =
    String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000');

void main() {
  runApp(TaskManagerApp(client: TaskApiClient(baseUrl: apiBaseUrl)));
}

/// Root widget. The [client] is injected so tests can provide a fake.
class TaskManagerApp extends StatefulWidget {
  /// Creates the app.
  const TaskManagerApp({super.key, required this.client});

  /// API client shared by all screens.
  final TaskApiClient client;

  @override
  State<TaskManagerApp> createState() => _TaskManagerAppState();
}

class _TaskManagerAppState extends State<TaskManagerApp> {
  bool _signedIn = false;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Task Manager',
      theme: ThemeData(colorSchemeSeed: Colors.indigo, useMaterial3: true),
      home: _signedIn
          ? TasksScreen(
              client: widget.client,
              onLoggedOut: () => setState(() => _signedIn = false),
            )
          : LoginScreen(
              client: widget.client,
              onLoggedIn: () => setState(() => _signedIn = true),
            ),
    );
  }
}

/// Email + password sign-in.
class LoginScreen extends StatefulWidget {
  /// Creates the login screen.
  const LoginScreen({super.key, required this.client, required this.onLoggedIn});

  /// API client.
  final TaskApiClient client;

  /// Called after a successful sign-in.
  final VoidCallback onLoggedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return; // evita doble envío por taps rápidos
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.client.login(_email.text.trim(), _password.text);
      widget.onLoggedIn();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } on Object {
      setState(() => _error = 'No connection. Check your network and try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            TextField(
              key: const Key('email-field'),
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            const SizedBox(height: 16),
            TextField(
              key: const Key('password-field'),
              controller: _password,
              obscureText: true,
              autofillHints: const [AutofillHints.password],
              decoration: const InputDecoration(labelText: 'Password'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Semantics(
                liveRegion: true,
                child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              key: const Key('login-button'),
              onPressed: _busy ? null : _submit,
              child: Text(_busy ? 'Signing in…' : 'Sign in'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Signed-in task list with create, complete and logout.
class TasksScreen extends StatefulWidget {
  /// Creates the task screen.
  const TasksScreen({super.key, required this.client, required this.onLoggedOut});

  /// API client.
  final TaskApiClient client;

  /// Called after logout or when the session expires.
  final VoidCallback onLoggedOut;

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  bool _loading = true;
  String? _error;
  List<Task> _tasks = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final tasks = await widget.client.listTasks();
      if (mounted) setState(() => _tasks = tasks);
    } on ApiException catch (e) {
      if (e.unauthorized) return widget.onLoggedOut();
      if (mounted) setState(() => _error = e.message);
    } on Object {
      if (mounted) setState(() => _error = 'Could not load tasks.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggle(Task task, bool completed) async {
    try {
      final updated = await widget.client.setCompleted(task.id, completed);
      setState(() => _tasks = [for (final t in _tasks) t.id == updated.id ? updated : t]);
    } on Object {
      _snack('Could not update the task.');
    }
  }

  Future<void> _addTask() async {
    final title = await showDialog<String>(
      context: context,
      builder: (_) => const _NewTaskDialog(),
    );
    if (title == null) return;
    try {
      final task = await widget.client.createTask(title);
      setState(() => _tasks = [task, ..._tasks]);
    } on ApiException catch (e) {
      _snack(e.message);
    } on Object {
      _snack('Could not save the task.');
    }
  }

  Future<void> _logout() async {
    await widget.client.logout();
    widget.onLoggedOut();
  }

  void _snack(String message) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My tasks'),
        actions: [
          IconButton(
            key: const Key('logout-button'),
            tooltip: 'Log out', // nombre accesible para lectores de pantalla
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          ),
        ],
      ),
      body: TaskListPanel(
        loading: _loading,
        tasks: _tasks,
        errorMessage: _error,
        onRetry: _load,
        onToggleComplete: _toggle,
      ),
      floatingActionButton: FloatingActionButton(
        key: const Key('add-task-button'),
        tooltip: 'Add task',
        onPressed: _addTask,
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _NewTaskDialog extends StatefulWidget {
  const _NewTaskDialog();

  @override
  State<_NewTaskDialog> createState() => _NewTaskDialogState();
}

class _NewTaskDialogState extends State<_NewTaskDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _save() {
    final error = Task.validateTitle(_controller.text);
    if (error != null) return setState(() => _error = error);
    Navigator.of(context).pop(_controller.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('New task'),
      content: TextField(
        key: const Key('task-title-field'),
        controller: _controller,
        autofocus: true,
        maxLength: Task.maxTitleLength,
        decoration: InputDecoration(labelText: 'Title', errorText: _error),
        onSubmitted: (_) => _save(),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        FilledButton(key: const Key('save-task-button'), onPressed: _save, child: const Text('Save')),
      ],
    );
  }
}
