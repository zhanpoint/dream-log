from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import logging
import uuid
import time
from ..utils.oss import OSS
from ..models import UploadedImage
from ..serializers.dream_serializers import UploadedImageSerializer
from ..tasks.image_cleanup_tasks import schedule_image_deletion

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_signature(request):
    """为客户端生成OSS上传签名，不创建数据库记录。"""
    file_name = request.data.get('file_name')
    content_type = request.data.get('content_type', 'application/octet-stream')

    if not file_name:
        return Response({'detail': '缺少文件名'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        oss_client = OSS(user_id=request.user.id)
        unique_id = str(uuid.uuid4())
        unique_filename = f"{unique_id}_{file_name}"
        
        presigned_data = oss_client.generate_presigned_url(unique_filename, content_type)
        
        return Response(presigned_data, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"生成上传签名失败: {e}", exc_info=True)
        return Response({'detail': f'服务器内部错误: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_upload(request):
    """客户端完成上传后，创建图片数据库记录。"""
    file_key = request.data.get('file_key')
    access_url = request.data.get('access_url')

    if not file_key or not access_url:
        return Response({'detail': '缺少 file_key 或 access_url'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        image, created = UploadedImage.objects.get_or_create(
            user=request.user,
            file_key=file_key,
            defaults={'url': access_url, 'status': 'active'}
        )
        
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        serializer = UploadedImageSerializer(image)
        return Response(serializer.data, status=status_code)

    except Exception as e:
        logger.error(f"完成图片上传失败: {e}", exc_info=True)
        return Response({'detail': '服务器内部错误'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_images_for_deletion(request):
    """接收前端待删除图片列表，标记图片为待删除状态，并启动定时删除任务。"""
    image_urls = request.data.get('image_urls', [])

    if not isinstance(image_urls, list):
        return Response({'error': 'image_urls 必须是一个列表'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        updated_images = UploadedImage.objects.filter(
            url__in=image_urls, 
            user=request.user,
            status='active'
        ).update(status='pending_delete')
        
        logger.info(f"标记 {updated_images} 张图片为待删除状态。")

        # 启动后台任务，在10分钟后执行物理删除
        if updated_images > 0:
            schedule_image_deletion.apply_async(args=[image_urls], countdown=600)

        return Response({
            'message': f'成功标记 {updated_images} 张图片待删除，删除任务已启动。'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"标记图片待删除失败: {e}", exc_info=True)
        return Response({'detail': '服务器内部错误'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_sts_token(request):
    """获取STS令牌 - 保持原有功能"""
    try:
        user = request.user
        
        oss_client = OSS(user_id=user.id)
        sts_token = oss_client._get_sts_token()
        
        response_data = {
            'credentials': {
                'access_key_id': sts_token['access_key_id'],
                'access_key_secret': sts_token['access_key_secret'],
                'security_token': sts_token['security_token'],
                'expiration': int(time.time()) + 3600
            },
            'bucket': oss_client.bucket_name,
            'region': 'oss-cn-wuhan-lr',
            'endpoint': oss_client.endpoint,
            'user_prefix': oss_client.user_prefix
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': '获取STS凭证失败', 'detail': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )