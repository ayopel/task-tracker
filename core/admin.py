from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import ActivityLogEntry, InviteToken, Project, Task, User

admin.site.register(User, UserAdmin)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "created_by", "created_at"]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "status", "priority", "created_at"]
    list_filter = ["status", "priority", "project"]


@admin.register(InviteToken)
class InviteTokenAdmin(admin.ModelAdmin):
    list_display = ["token", "created_by", "used", "expires_at"]


@admin.register(ActivityLogEntry)
class ActivityLogEntryAdmin(admin.ModelAdmin):
    list_display = ["action_type", "actor", "project", "created_at"]
    list_filter = ["action_type", "project"]
