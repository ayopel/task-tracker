import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def send_assignment_email(task, assignee, assigning_user):
    """
    Send an email notification when a user is assigned to a task.
    Uses the Resend API if configured, otherwise logs the intent.
    """
    subject = f"You've been assigned to: {task.title}"
    body = (
        f"Hi {assignee.get_full_name() or assignee.username},\n\n"
        f"{assigning_user.get_full_name() or assigning_user.username} assigned you to "
        f'"{task.title}" in project "{task.project.name}".\n\n'
        f"Priority: {task.get_priority_display()}\n"
        f"Status: {task.get_status_display()}\n"
    )
    if task.due_date:
        body += f"Due: {task.due_date}\n"

    if not settings.RESEND_API_KEY:
        logger.info("Email not sent (no RESEND_API_KEY): %s → %s", subject, assignee.email)
        return

    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send(
            {
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": [assignee.email],
                "subject": subject,
                "text": body,
            }
        )
        logger.info("Assignment email sent to %s for task '%s'", assignee.email, task.title)
    except Exception:
        logger.exception("Failed to send assignment email to %s", assignee.email)
