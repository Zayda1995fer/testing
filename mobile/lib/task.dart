/// Converts a JSON object into a task value.
class Task {
  /// Creates a task.
  const Task({required this.id, required this.title, this.completed = false});

  /// Maximum title length accepted by the API (same rule as the backend).
  static const int maxTitleLength = 120;

  /// Unique server identifier.
  final String id;

  /// User-visible task title.
  final String title;

  /// Whether the task has been marked complete.
  final bool completed;

  /// Parses a task from JSON.
  ///
  /// Throws [FormatException] when required fields are missing or invalid.
  factory Task.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final title = json['title'];
    final completed = json['completed'] ?? false;

    if (id is! String || id.isEmpty) {
      throw const FormatException('Invalid task data.');
    }
    if (title is! String || validateTitle(title) != null) {
      throw const FormatException('Invalid task data.');
    }
    if (completed is! bool) {
      throw const FormatException('Invalid task data.');
    }

    return Task(id: id, title: title, completed: completed);
  }

  /// Returns an error message for an invalid title, or `null` when valid.
  ///
  /// Used both by [Task.fromJson] and by the "new task" form.
  static String? validateTitle(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty || trimmed.length > maxTitleLength) {
      return 'Enter a valid title.';
    }
    return null;
  }

  /// Returns a copy with a different completion state.
  Task copyWith({bool? completed}) =>
      Task(id: id, title: title, completed: completed ?? this.completed);
}
