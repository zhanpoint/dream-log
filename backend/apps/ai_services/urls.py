from django.urls import path
from .views.generate_dream_title import generate_title_view

urlpatterns = [
    path('generate-title/', generate_title_view, name='generate_dream_title'),
]