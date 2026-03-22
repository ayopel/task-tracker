from django.contrib import messages
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from .activity import log_activity
from .forms import LoginForm, ProjectForm, RegisterForm, TaskForm
from .models import ActivityLogEntry, InviteToken, Project, Task
from .notifications import send_assignment_email

User = get_user_model()


# ── Auth ─────────────────────────────────────────────────────────────────

def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    form = LoginForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = authenticate(
            request,
            username=form.cleaned_data["username"],
            password=form.cleaned_data["password"],
        )
        if user:
            login(request, user)
            return redirect(request.GET.get("next", "dashboard"))
        form.add_error(None, "Invalid username or password.")
    return render(request, "core/login.html", {"form": form})


@login_required
def logout_view(request):
    logout(request)
    return redirect("login")


def register_via_invite(request, token):
    invite = get_object_or_404(InviteToken, token=token)
    if not invite.is_valid:
        return render(request, "core/invite_invalid.html")

    form = RegisterForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.save()
        invite.used = True
        invite.used_by = user
        invite.save()
        login(request, user)
        messages.success(request, "Welcome! Your account has been created.")
        return redirect("dashboard")
    return render(request, "core/register.html", {"form": form, "invite": invite})


# ── Dashboard ────────────────────────────────────────────────────────────

@login_required
def dashboard(request):
    projects = Project.objects.all()
    my_tasks = Task.objects.filter(assignees=request.user).exclude(status=Task.Status.DONE)[:10]
    return render(request, "core/dashboard.html", {"projects": projects, "my_tasks": my_tasks})


# ── Projects ─────────────────────────────────────────────────────────────

@login_required
def project_create(request):
    form = ProjectForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        project = form.save(commit=False)
        project.created_by = request.user
        project.save()
        messages.success(request, f'Project "{project.name}" created.')
        return redirect("project_board", pk=project.pk)
    return render(request, "core/project_form.html", {"form": form, "title": "New Project"})


@login_required
def project_board(request, pk):
    project = get_object_or_404(Project, pk=pk)
    tasks = project.tasks.all()

    # Filtering
    assignee_id = request.GET.get("assignee")
    priority = request.GET.get("priority")
    label = request.GET.get("label")
    search = request.GET.get("q")

    if assignee_id:
        tasks = tasks.filter(assignees__id=assignee_id)
    if priority:
        tasks = tasks.filter(priority=priority)
    if label:
        # JSONField __contains works on PostgreSQL; for SQLite fallback use icontains on raw JSON
        from django.db import connection
        if connection.vendor == "postgresql":
            tasks = tasks.filter(labels__contains=[label])
        else:
            tasks = tasks.filter(labels__icontains=f'"{label}"')
    if search:
        tasks = tasks.filter(title__icontains=search)

    todo = tasks.filter(status=Task.Status.TODO)
    in_progress = tasks.filter(status=Task.Status.IN_PROGRESS)
    done = tasks.filter(status=Task.Status.DONE)

    # Collect all labels for filter dropdown
    all_labels = set()
    for t in project.tasks.all():
        all_labels.update(t.labels or [])

    return render(
        request,
        "core/board.html",
        {
            "project": project,
            "columns": [
                {"title": "To Do", "status": "todo", "tasks": todo},
                {"title": "In Progress", "status": "in_progress", "tasks": in_progress},
                {"title": "Done", "status": "done", "tasks": done},
            ],
            "users": User.objects.all(),
            "priorities": Task.Priority.choices,
            "all_labels": sorted(all_labels),
            "filters": {
                "assignee": assignee_id,
                "priority": priority,
                "label": label,
                "q": search or "",
            },
        },
    )


@login_required
def project_activity(request, pk):
    project = get_object_or_404(Project, pk=pk)
    entries = project.activity_log.select_related("actor", "task")[:100]
    return render(
        request, "core/activity_log.html", {"project": project, "entries": entries}
    )


# ── Tasks ────────────────────────────────────────────────────────────────

@login_required
def task_create(request, project_pk):
    project = get_object_or_404(Project, pk=project_pk)
    form = TaskForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        task = form.save(commit=False)
        task.project = project
        task.created_by = request.user
        task.save()
        form.save_m2m()

        log_activity(
            project, request.user, ActivityLogEntry.ActionType.TASK_CREATED,
            f'Created task "{task.title}"', task,
        )

        for assignee in task.assignees.all():
            log_activity(
                project, request.user, ActivityLogEntry.ActionType.ASSIGNEE_ADDED,
                f'Assigned {assignee} to "{task.title}"', task,
            )
            send_assignment_email(task, assignee, request.user)

        messages.success(request, f'Task "{task.title}" created.')
        return redirect("project_board", pk=project.pk)
    return render(
        request,
        "core/task_form.html",
        {"form": form, "project": project, "title": "New Task"},
    )


@login_required
def task_edit(request, pk):
    task = get_object_or_404(Task, pk=pk)
    old_assignee_ids = set(task.assignees.values_list("id", flat=True))
    old_status = task.status

    form = TaskForm(request.POST or None, instance=task)
    if request.method == "POST" and form.is_valid():
        task = form.save()
        new_assignee_ids = set(task.assignees.values_list("id", flat=True))

        # Log edits
        changes = []
        if old_status != task.status:
            changes.append(f"status → {task.get_status_display()}")
            log_activity(
                task.project, request.user, ActivityLogEntry.ActionType.TASK_STATUS_CHANGED,
                f'Changed "{task.title}" status to {task.get_status_display()}', task,
            )
        # Detect other field changes via form
        for field in ["title", "description", "due_date", "priority"]:
            if field in form.changed_data:
                changes.append(field)
        if "labels_text" in form.changed_data:
            changes.append("labels")
        if changes and "status" not in changes:
            log_activity(
                task.project, request.user, ActivityLogEntry.ActionType.TASK_EDITED,
                f'Edited "{task.title}": {", ".join(changes)}', task,
            )

        # Assignee changes
        added = new_assignee_ids - old_assignee_ids
        removed = old_assignee_ids - new_assignee_ids
        for uid in added:
            assignee = User.objects.get(pk=uid)
            log_activity(
                task.project, request.user, ActivityLogEntry.ActionType.ASSIGNEE_ADDED,
                f'Assigned {assignee} to "{task.title}"', task,
            )
            send_assignment_email(task, assignee, request.user)
        for uid in removed:
            assignee = User.objects.get(pk=uid)
            log_activity(
                task.project, request.user, ActivityLogEntry.ActionType.ASSIGNEE_REMOVED,
                f'Removed {assignee} from "{task.title}"', task,
            )

        messages.success(request, f'Task "{task.title}" updated.')
        return redirect("project_board", pk=task.project.pk)
    return render(
        request,
        "core/task_form.html",
        {"form": form, "project": task.project, "title": f"Edit: {task.title}", "task": task},
    )


@login_required
def task_detail(request, pk):
    task = get_object_or_404(Task.objects.select_related("project", "created_by"), pk=pk)
    return render(request, "core/task_detail.html", {"task": task})


@login_required
@require_POST
def task_delete(request, pk):
    task = get_object_or_404(Task, pk=pk)
    project = task.project
    log_activity(
        project, request.user, ActivityLogEntry.ActionType.TASK_DELETED,
        f'Deleted task "{task.title}"', None,
    )
    task.delete()
    messages.success(request, "Task deleted.")
    return redirect("project_board", pk=project.pk)


@login_required
@require_POST
def task_move(request, pk):
    """AJAX endpoint: update task status via drag-and-drop."""
    task = get_object_or_404(Task, pk=pk)
    new_status = request.POST.get("status")
    if new_status not in dict(Task.Status.choices):
        return JsonResponse({"error": "Invalid status"}, status=400)

    old_status = task.status
    if old_status != new_status:
        task.status = new_status
        task.save(update_fields=["status", "updated_at"])
        log_activity(
            task.project, request.user, ActivityLogEntry.ActionType.TASK_STATUS_CHANGED,
            f'Moved "{task.title}" from {dict(Task.Status.choices)[old_status]} to {dict(Task.Status.choices)[new_status]}',
            task,
        )
    return JsonResponse({"ok": True})


# ── Invites ──────────────────────────────────────────────────────────────

@login_required
def invite_create(request):
    if request.method == "POST":
        invite = InviteToken(
            created_by=request.user,
            expires_at=timezone.now() + timezone.timedelta(days=7),
        )
        invite.save()
        link = request.build_absolute_uri(f"/invite/{invite.token}/")
        return render(request, "core/invite_created.html", {"link": link, "invite": invite})
    return render(request, "core/invite_form.html")
