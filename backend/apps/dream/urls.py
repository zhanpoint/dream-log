from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import oss
from .views.dream import DreamViewSet, DreamJournalViewSet, SleepPatternViewSet
from .views.statistics import dream_statistics

# 创建路由器并注册ViewSet
router = DefaultRouter()
router.register(r'dreams', DreamViewSet, basename='dream')
router.register(r'dream-journals', DreamJournalViewSet, basename='dream-journal')
router.register(r'sleep-patterns', SleepPatternViewSet, basename='sleep-pattern')

# OSS文件存储API
file_urlpatterns = [
    path('upload-signature/', oss.upload_signature, name='file-upload-signature'),
    path('complete-upload/', oss.complete_upload, name='file-complete-upload'),
    path('mark-for-deletion/', oss.mark_images_for_deletion, name='file-mark-for-deletion'),
    path('sts-token/', oss.get_sts_token, name='file-sts-token'),
]

# dream app的主路由
urlpatterns = [
    # 包含ViewSet路由
    path('', include(router.urls)),
    # 文件相关路由
    path('files/', include(file_urlpatterns)),
    # 统计路由
    path('statistics/', dream_statistics, name='dream-statistics'),
]
