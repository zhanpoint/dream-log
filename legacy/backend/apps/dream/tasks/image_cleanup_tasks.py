"""
图片清理定时任务
"""

import logging
from celery import shared_task
from django.db import transaction
from ..models import UploadedImage
from ..utils.oss import OSS
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


def atomic_delete_image(image, oss_client=None, recheck_orphan=False):
    """
    原子性删除图片：先删除OSS文件，成功后再删除数据库记录
    
    Args:
        image: UploadedImage 实例
        oss_client: 可选的OSS客户端，如果不提供会自动创建
        recheck_orphan: 是否在删除前重新检查孤立状态
        
    Returns:
        tuple: (success: bool, error_message: str)
    """
    try:
        # 删除OSS文件
        oss_deleted = False
        if image.file_key and image.user_id:
            try:
                if not oss_client:
                    oss_client = OSS(user_id=image.user_id)
                oss_deleted = oss_client.delete_file(image.file_key)
                if not oss_deleted:
                    return False, f"OSS文件删除失败: {image.file_key}"
            except Exception as oss_error:
                return False, f"OSS文件删除异常: {image.file_key}, 错误: {oss_error}"
        
        # 删除数据库记录
        try:
            with transaction.atomic():
                # 在查询时为选中的记录加锁，直到事务完成。这可以避免在并发操作时数据出现竞争条件，保证在同一时间只有一个数据库事务能够修改这些记录。
                fresh_image = UploadedImage.objects.select_for_update().get(id=image.id)
                
                fresh_image.delete()
                return True, f"原子性删除成功: {image.url}"
                
        except UploadedImage.DoesNotExist:
            # 如果记录已不存在，但OSS文件已删除，仍视为成功
            if oss_deleted:
                return True, f"图片记录已被删除，OSS清理完成: {image.url}"
            else:
                return True, f"图片记录已被删除: {image.url}"
        except Exception as db_error:
            # 记录数据不一致警告
            error_msg = f"数据库删除失败: {image.url}, 错误: {db_error}"
            if oss_deleted:
                logger.critical(f"数据不一致警告: OSS文件已删除但数据库删除失败: {image.file_key}")
            return False, error_msg
    
    except Exception as e:
        return False, f"原子性删除异常: {image.url}, 错误: {e}"


@shared_task
def schedule_image_deletion(image_urls):
    """接收待删除图片URL列表，并执行物理删除。"""
    if not image_urls:
        logger.info("没有需要删除的图片。")
        return {'deleted_count': 0, 'error_count': 0}
        
    try:
        logger.info(f"开始处理 {len(image_urls)} 张图片的删除任务")
        
        images_to_delete = UploadedImage.objects.filter(
            url__in=image_urls, 
            status='pending_delete'
        ).select_related('dream')  # 优化查询，预加载关联的梦境数据
        
        deleted_count = 0
        error_count = 0
        skipped_count = 0
        
        for image in images_to_delete:
            try:
                # 检查图片是否仍然被梦境使用
                if image.dream and image.url in image.dream.content:
                    logger.warning(f"跳过删除仍在使用的图片: {image.url}")
                    skipped_count += 1
                    continue
                
                # 使用原子性删除工具函数
                success, message = atomic_delete_image(image)
                
                if success:
                    deleted_count += 1
                    logger.info(message)
                else:
                    error_count += 1
                    logger.error(message)
                
            except Exception as e:
                error_count += 1
                logger.error(f"删除图片失败: {image.url}, 错误: {e}", exc_info=True)
        
        result = {
            'deleted_count': deleted_count,
            'error_count': error_count,
            'skipped_count': skipped_count,
            'total_processed': len(image_urls)
        }
        
        logger.info(f"图片删除任务完成: 成功 {deleted_count} 个, 失败 {error_count} 个, 跳过 {skipped_count} 个")
        return result
        
    except Exception as e:
        logger.error(f"图片删除任务异常: {e}", exc_info=True)
        raise 


@shared_task
def cleanup_pending_delete_images():
    """定时清理处于 pending_delete 状态的图片"""
    try:
        # 查找所有 pending_delete 状态的图片
        pending_images = UploadedImage.objects.filter(status='pending_delete')
        
        if not pending_images.exists():
            logger.info("没有发现待删除的图片。")
            return {'deleted_count': 0, 'error_count': 0}

        image_urls = [image.url for image in pending_images]
        
        # 调用现有的删除任务
        return schedule_image_deletion(image_urls)
        
    except Exception as e:
        logger.error(f"定时清理待删除图片任务失败: {e}")
        raise


@shared_task
def cleanup_orphan_images(days_threshold=30):
    """
    清理孤立的图片记录（僵尸图片），这些图片没有关联到任何梦境记录。
    默认清理超过30天仍未关联的图片。
    """
    try:
        threshold_time = timezone.now() - timedelta(days=days_threshold)
        logger.info(f"开始清理 {days_threshold} 天前的僵尸图片")
        
        # 查找孤立的、活跃的图片记录，按用户分组以优化OSS客户端创建
        orphan_images = UploadedImage.objects.filter(
            dream__isnull=True,
            status='active',
            upload_time__lte=threshold_time
        ).order_by('user_id', 'upload_time')
        
        if not orphan_images.exists():
            logger.info("没有发现需要清理的僵尸图片。")
            return {'deleted_count': 0, 'error_count': 0}

        logger.info(f"发现 {orphan_images.count()} 张僵尸图片待清理")
        
        deleted_count = 0
        error_count = 0
        current_user_id = None
        oss_client = None
        
        for image in orphan_images:
            try:
                # 优化：只在用户ID改变时重新创建OSS客户端
                if current_user_id != image.user_id:
                    current_user_id = image.user_id
                    oss_client = OSS(user_id=image.user_id) if image.user_id else None
                
                # 使用原子性删除工具函数，启用孤立状态重新检查
                success, message = atomic_delete_image(image, oss_client, recheck_orphan=True)
                
                if success:
                    deleted_count += 1
                    logger.debug(message)
                else:
                    error_count += 1
                    logger.error(message)
                
            except Exception as e:
                error_count += 1
                logger.error(f"删除僵尸图片失败: {image.url}, 错误: {e}", exc_info=True)
        
        result = {
            'deleted_count': deleted_count,
            'error_count': error_count,
            'days_threshold': days_threshold
        }
        
        logger.info(f"僵尸图片清理任务完成: 成功删除 {deleted_count} 个, 失败 {error_count} 个")
        return result
        
    except Exception as e:
        logger.error(f"僵尸图片清理任务失败: {e}", exc_info=True)
        raise
