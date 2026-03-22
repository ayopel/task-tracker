from django import forms
from django.contrib.auth import get_user_model
from .models import Project, Task
from .widget_styles import apply_tailwind_classes

User = get_user_model()


class StyledFormMixin:
    """Auto-apply Tailwind classes on init."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        apply_tailwind_classes(self)


class LoginForm(StyledFormMixin, forms.Form):
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={"placeholder": "Username", "autofocus": True}),
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={"placeholder": "Password"}),
    )


class RegisterForm(StyledFormMixin, forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={"placeholder": "Password"}),
    )
    password_confirm = forms.CharField(
        widget=forms.PasswordInput(attrs={"placeholder": "Confirm password"}),
        label="Confirm password",
    )

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "username"]
        widgets = {
            "first_name": forms.TextInput(attrs={"placeholder": "First name"}),
            "last_name": forms.TextInput(attrs={"placeholder": "Last name"}),
            "email": forms.EmailInput(attrs={"placeholder": "Email"}),
            "username": forms.TextInput(attrs={"placeholder": "Username"}),
        }

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("password") != cleaned.get("password_confirm"):
            raise forms.ValidationError("Passwords do not match.")
        return cleaned

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user


class ProjectForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Project
        fields = ["name", "description"]
        widgets = {
            "name": forms.TextInput(attrs={"placeholder": "Project name"}),
            "description": forms.Textarea(
                attrs={"placeholder": "Optional description", "rows": 3}
            ),
        }


class TaskForm(StyledFormMixin, forms.ModelForm):
    labels_text = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={"placeholder": "e.g. bug, frontend, urgent"}),
        label="Labels",
        help_text="Comma-separated labels",
    )
    assignees = forms.ModelMultipleChoiceField(
        queryset=User.objects.all(),
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )

    class Meta:
        model = Task
        fields = ["title", "description", "status", "priority", "due_date", "assignees"]
        widgets = {
            "title": forms.TextInput(attrs={"placeholder": "Task title"}),
            "description": forms.Textarea(attrs={"placeholder": "Description", "rows": 3}),
            "due_date": forms.DateInput(attrs={"type": "date"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields["labels_text"].initial = ", ".join(self.instance.labels or [])

    def clean_labels_text(self):
        raw = self.cleaned_data.get("labels_text", "")
        if not raw.strip():
            return []
        return [label.strip() for label in raw.split(",") if label.strip()]

    def save(self, commit=True):
        task = super().save(commit=False)
        task.labels = self.cleaned_data["labels_text"]
        if commit:
            task.save()
            self.save_m2m()
        return task
