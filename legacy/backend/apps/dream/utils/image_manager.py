"""
图片软删除管理服务
"""

import logging
from typing import Set, Dict, Optional
from bs4 import BeautifulSoup
from django.utils import timezone
from django.db import transaction

from ..models import UploadedImage, Dream
from apps.user.models import User
from .oss import OSS

logger = logging.getLogger(__name__)


class ImageLifecycleManager:
    """图片生命周期管理器 - 简化版"""

    def __init__(self, user: User):
        self.user = user
        self.oss_client = OSS(user_id=user.id)

    def extract_image_urls_from_html(self, html_content: str) -> Set[str]:
        """从HTML内容中提取所有图片URL"""
        if not html_content:
            return set()

        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            img_tags = soup.find_all('img')

            urls = set()
            for img in img_tags:
                src = img.get('src')
                if src and self._is_valid_image_url(src):
                    urls.add(src.strip())

            return urls

        except Exception as e:
            logger.error(f"解析HTML内容失败: {e}")
            return set()

    def _is_valid_image_url(self, url: str) -> bool:
        """检查是否为本项目的图片URL"""
        if not url or not url.strip():
            return False

        # 检查是否为本项目的图片URL
        return any(domain in url for domain in [
            'dream-log', 'oss-cn-', 'aliyuncs.com'
        ])

    def calculate_image_differences(self, old_content: str, new_content: str) -> tuple:
        """计算新旧内容的图片差异"""
        old_urls = self.extract_image_urls_from_html(old_content or '')
        new_urls = self.extract_image_urls_from_html(new_content or '')

        deleted_urls = old_urls - new_urls  # 在旧内容中但不在新内容中
        added_urls = new_urls - old_urls    # 在新内容中但不在旧内容中

        return deleted_urls, added_urls

    @transaction.atomic
    def process_dream_image_changes(self, dream: Dream, old_content: str = None, new_content: str = None) -> Dict[str, int]:
        """处理梦境图片变化，执行软删除逻辑"""
        if new_content is None:
            new_content = dream.content

        stats = {
            'marked_for_delete': 0,
            'newly_registered': 0,
        }

        if old_content is not None:
            # 编辑模式：比较新旧内容
            deleted_urls, added_urls = self.calculate_image_differences(old_content, new_content)

            # 标记删除的图片
            for url in deleted_urls:
                if self._mark_image_for_deletion(url):
                    stats['marked_for_delete'] += 1

            # 注册新增的图片 (或恢复使用的图片)
            for url in added_urls:
                if self._register_or_update_image(url, dream):
                    stats['newly_registered'] += 1
        else:
            # 创建模式：注册所有图片
            image_urls = self.extract_image_urls_from_html(new_content)
            for url in image_urls:
                if self._register_or_update_image(url, dream):
                    stats['newly_registered'] += 1

        logger.info(f"梦境 {dream.id} 图片处理完成: {stats}")
        return stats

    def _mark_image_for_deletion(self, url: str) -> bool:
        """标记图片为待删除状态"""
        try:
            image = UploadedImage.objects.get(url=url, user=self.user, status='active')
            image.status = 'pending_delete'
            image.save(update_fields=['status'])
            logger.info(f"图片已标记为待删除: {url}")
            return True
        except UploadedImage.DoesNotExist:
            # 如果图片已经是待删除状态或不存在，则忽略
            logger.warning(f"尝试标记删除一个非活跃状态或不存在的图片: {url}")
            return False
        except Exception as e:
            logger.error(f"标记图片删除失败: {url}, 错误: {e}")
            return False

    def _register_or_update_image(self, url: str, dream: Dream) -> bool:
        """注册新的图片到数据库，如果已存在则更新其状态和关联"""
        try:
            # 尝试获取或创建图片记录
            image, created = UploadedImage.objects.get_or_create(
                url=url,
                user=self.user,
                defaults={
                    'file_key': self._extract_file_key_from_url(url) or '',
                    'dream': dream,
                    'status': 'active'
                }
            )

            if created:
                logger.info(f"新图片已注册: {url}")
                return True

            # 如果图片已存在，则检查并更新其状态和关联
            update_fields = []
            if image.status != 'active':
                image.status = 'active'
                update_fields.append('status')

            if image.dream != dream:
                image.dream = dream
                update_fields.append('dream')

            if update_fields:
                image.save(update_fields=update_fields)
                logger.info(f"已存在的图片状态已更新: {url}")

            # 返回False，因为它不是新创建的
            return False

        except Exception as e:
            logger.error(f"注册或更新图片失败: {url}, 错误: {e}")
            return False

    def _extract_file_key_from_url(self, url: str) -> Optional[str]:
        """从URL中提取OSS文件key"""
        try:
            if '/users/' in url:
                # 假设URL结构为 .../users/user_id/image.jpg
                return 'users/' + url.split('/users/', 1)[1]
            return None
        except Exception:
            return None

    def cleanup_user_images(self, hours_threshold: int = 24) -> Dict[str, int]:
        """清理用户的过期待删除图片"""
        threshold_time = timezone.now() - timezone.timedelta(hours=hours_threshold)

        # 筛选出在阈值时间之前被标记为待删除的图片
        pending_images = UploadedImage.objects.filter(
            user=self.user,
            status='pending_delete',
            updated_at__lte=threshold_time
        ).order_by('updated_at')

        stats = {
            'total_pending': len(pending_images),
            'success': 0,
            'failed': 0
        }

        for image in pending_images:
            try:
                # 尝试从OSS删除
                oss_success = True
                if image.file_key:
                    oss_success = self.oss_client.delete_file(image.file_key)

                if oss_success:
                    # 从数据库删除记录
                    image.delete()
                    stats['success'] += 1
                    logger.info(f"图片清理成功: {image.url}")
                else:
                    stats['failed'] += 1
                    logger.error(f"OSS删除失败: {image.url}")

            except Exception as e:
                stats['failed'] += 1
                logger.error(f"图片清理异常: {image.url}, 错误: {e}")

        logger.info(f"用户 {self.user.id} 图片清理完成: {stats}")
        return stats
