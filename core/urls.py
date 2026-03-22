from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("invite/<str:token>/", views.register_via_invite, name="register_via_invite"),

    # Dashboard
    path("", views.dashboard, name="dashboard"),

    # Projects
    path("projects/new/", views.project_create, name="project_create"),
    path("projects/<int:pk>/", views.project_board, name="project_board"),
    path("projects/<int:pk>/activity/", views.project_activity, name="project_activity"),

    # Tasks
    path("projects/<int:project_pk>/tasks/new/", views.task_create, name="task_create"),
    path("tasks/<int:pk>/", views.task_detail, name="task_detail"),
    path("tasks/<int:pk>/edit/", views.task_edit, name="task_edit"),
    path("tasks/<int:pk>/delete/", views.task_delete, name="task_delete"),
    path("tasks/<int:pk>/move/", views.task_move, name="task_move"),

    # Invites
    path("invites/new/", views.invite_create, name="invite_create"),
]
