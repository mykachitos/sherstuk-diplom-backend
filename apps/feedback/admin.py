from django.contrib import admin

from apps.feedback.models import ContactRequest


@admin.register(ContactRequest)
class ContactRequestAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "processed", "created_at")
    list_filter = ("processed", "created_at")
    search_fields = ("name", "email", "phone", "message")

