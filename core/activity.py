from .models import ActivityLogEntry


def log_activity(project, actor, action_type, description, task=None):
    """Create an activity log entry. Single point of entry for all logging."""
    ActivityLogEntry.objects.create(
        project=project,
        actor=actor,
        task=task,
        action_type=action_type,
        description=description,
    )
