"""
Custom form rendering: auto-apply Tailwind classes to all widgets.
Import and use TailwindFormMixin or call apply_tailwind_classes(form).
"""

TAILWIND_INPUT = (
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm "
    "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
)
TAILWIND_SELECT = TAILWIND_INPUT
TAILWIND_TEXTAREA = TAILWIND_INPUT + " resize-y"
TAILWIND_CHECKBOX = "rounded border-gray-300 text-brand-600 focus:ring-brand-500"


def apply_tailwind_classes(form):
    """Mutate form widget attrs to add Tailwind classes."""
    from django.forms import widgets as w

    for field in form.fields.values():
        widget = field.widget
        existing = widget.attrs.get("class", "")
        if isinstance(widget, w.Textarea):
            widget.attrs["class"] = f"{TAILWIND_TEXTAREA} {existing}".strip()
        elif isinstance(widget, (w.Select, w.SelectMultiple)):
            widget.attrs["class"] = f"{TAILWIND_SELECT} {existing}".strip()
        elif isinstance(widget, (w.CheckboxInput, w.CheckboxSelectMultiple)):
            widget.attrs["class"] = f"{TAILWIND_CHECKBOX} {existing}".strip()
        elif isinstance(widget, (w.TextInput, w.EmailInput, w.PasswordInput, w.DateInput, w.NumberInput)):
            widget.attrs["class"] = f"{TAILWIND_INPUT} {existing}".strip()
