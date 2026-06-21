from django.db import models

from apps.catalog.models import TimeStampedModel


class ContactRequest(TimeStampedModel):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=32, blank=True)
    message = models.TextField()
    personal_data_consent = models.BooleanField(default=False)
    processed = models.BooleanField(default=False)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.name} <{self.email}>"

