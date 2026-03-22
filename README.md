# Team Task Tracker

A shared Kanban-based task management tool for small teams (6–15 members).  
Built with Django, PostgreSQL, Tailwind CSS, and SortableJS.

## Features

- **Kanban Board** — Drag-and-drop tasks between To Do, In Progress, and Done
- **Projects** — Organize tasks into separate project boards
- **Filtering & Search** — Filter by assignee, priority, label, or keyword
- **Free-text Labels** — Tag tasks with comma-separated labels
- **Activity Log** — Per-project timeline of all task changes
- **Invite System** — Generate single-use invite links (7-day expiry)
- **Email Notifications** — Notify users when assigned to tasks (via Resend)
- **Mobile Friendly** — Responsive layout with status selector fallback on mobile

## Quick Start (Local Development)

```bash
# Clone and enter project
git clone <repo-url> && cd team-task-tracker

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create first user (superuser)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

Visit `http://localhost:8000` and log in. Create a project, add tasks, and invite teammates.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Secret key for production | Dev key (insecure) |
| `DJANGO_DEBUG` | Enable debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated hosts | `*` |
| `DATABASE_URL` | PostgreSQL connection URL | SQLite (local) |
| `RESEND_API_KEY` | Resend API key for emails | Empty (emails logged) |
| `DEFAULT_FROM_EMAIL` | Sender email address | `noreply@tasktracker.example.com` |

## Deploy to Render

1. Push to a Git repository
2. Create a new Web Service on Render
3. Set build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
4. Set start command: `gunicorn tasktracker.wsgi`
5. Add environment variables (`DJANGO_SECRET_KEY`, `DATABASE_URL`, etc.)
6. Add a PostgreSQL database and link it

## Project Structure

```
├── tasktracker/          # Django project settings & URLs
├── core/                 # Main app: models, views, forms, templates
│   ├── models.py         # User, Project, Task, InviteToken, ActivityLogEntry
│   ├── views.py          # All views (auth, board, tasks, invites)
│   ├── forms.py          # Form classes with Tailwind styling
│   ├── activity.py       # Activity log helper
│   ├── notifications.py  # Email notification via Resend
│   └── urls.py           # URL routing
├── templates/            # Django templates
│   ├── base.html         # Base layout with nav & Tailwind CDN
│   └── core/             # Feature templates
└── requirements.txt
```

## Tech Stack

- **Backend:** Python 3.12+, Django 5.x
- **Database:** PostgreSQL (production) / SQLite (development)
- **Frontend:** Django templates, Tailwind CSS (CDN), SortableJS
- **Email:** Resend
- **Hosting:** Render (recommended)
- **Static files:** WhiteNoise
