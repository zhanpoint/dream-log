from django.urls import path
from .views.generate_dream_title import generate_title_view
from .views.dream_analysis import (
    start_dream_analysis_view,
    cancel_analysis_view,
)

urlpatterns = [
    # 梦境标题生成
    path('generate-title/', generate_title_view, name='generate_dream_title'),
    
    # 梦境分析
    path('dream-analysis/start/', start_dream_analysis_view, name='start_dream_analysis'),
    path('dream-analysis/cancel/<str:task_id>/', cancel_analysis_view, name='cancel_analysis'),
]