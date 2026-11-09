import 'package:flutter/material.dart';

import 'task.dart';

/// Shows tasks or the current loading, empty, or error state.
class TaskListPanel extends StatelessWidget {
  /// Creates a task list panel.
  const TaskListPanel({
    super.key,
    required this.loading,
    required this.tasks,
    this.errorMessage,
    this.onRetry,
    this.onToggleComplete,
  });

  /// Whether tasks are being loaded.
  final bool loading;

  /// Tasks to display.
  final List<Task> tasks;

  /// Optional safe error message.
  final String? errorMessage;

  /// Called when the user taps "Retry" in the error state (exercise 5).
  /// When `null`, no retry button is shown.
  final VoidCallback? onRetry;

  /// Called when the user toggles a task's completion checkbox.
  final void Function(Task task, bool completed)? onToggleComplete;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(
        child: CircularProgressIndicator(semanticsLabel: 'Loading tasks'),
      );
    }
    if (errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // liveRegion: los lectores de pantalla anuncian el error.
              Semantics(
                liveRegion: true,
                child: Text(errorMessage!, textAlign: TextAlign.center),
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 16),
                FilledButton.icon(
                  key: const Key('retry-button'),
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
              ],
            ],
          ),
        ),
      );
    }
    if (tasks.isEmpty) {
      return const Center(child: Text('No tasks yet.'));
    }
    return ListView(
      children: [
        for (final task in tasks)
          CheckboxListTile(
            key: Key('task-${task.id}'),
            value: task.completed,
            onChanged: onToggleComplete == null
                ? null
                : (value) => onToggleComplete!(task, value ?? false),
            title: Text(
              task.title,
              // El estado no depende solo del color (checklist de accesibilidad).
              style: task.completed
                  ? const TextStyle(decoration: TextDecoration.lineThrough)
                  : null,
            ),
            subtitle: Text(task.completed ? 'Completed' : 'Pending'),
            controlAffinity: ListTileControlAffinity.leading,
          ),
      ],
    );
  }
}
