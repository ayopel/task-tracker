from django import template

register = template.Library()


@register.filter(name="addclass")
def addclass(field, css):
    """Add CSS class to a form field widget: {{ field|addclass:'...' }}"""
    return field.as_widget(attrs={"class": css})
