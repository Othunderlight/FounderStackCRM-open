# import os
# import threading

# import requests
# from django.conf import settings
# from django.db.models.signals import post_save
# from django.dispatch import receiver

# from .models import ActivityLog

# FASTAPI_URL = settings.FASTAPI_URL


# def send_to_fastapi(data):
#     """
#     Sends data to FastAPI in a separate thread to avoid blocking Django.
#     """
#     try:
#         url = f"{FASTAPI_URL}/trigger/activity-log"
#         response = requests.post(url, json=data, timeout=5)
#         print(f"FastAPI Trigger Response: {response.status_code}")
#     except Exception as e:
#         print(f"Error calling FastAPI trigger: {e}")


# @receiver(post_save, sender=ActivityLog)
# def activity_log_created(sender, instance, created, **kwargs):
#     if created:
#         data = {
#             "id": str(instance.id),
#             "type": instance.type,
#             "title": instance.title,
#             "content": instance.content,
#             "person_id": str(instance.related_person.id)
#             if instance.related_person
#             else None,
#             "company_id": str(instance.related_company.id)
#             if instance.related_company
#             else None,
#             "user_id": str(instance.user.id) if instance.user else None,
#         }
#         # Run in background thread to keep Django responsive
#         threading.Thread(target=send_to_fastapi, args=(data,), daemon=True).start()