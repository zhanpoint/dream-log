from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3, 'countdown': 60},
)
def send_contact_email_task(self, subject, message, from_email, contact_type='联系我们'):
    """
    发送联系我们/反馈建议邮件的异步任务
    
    Args:
        subject: 邮件主题
        message: 邮件内容
        from_email: 发件人邮箱
        contact_type: 联系类型（联系我们/反馈建议）
    
    Returns:
        dict: 发送结果
    """
    try:
        # 构建邮件内容
        email_content = f"""发件人邮箱：{from_email}

{message}"""
        
        # 发送邮件到指定邮箱
        send_mail(
            subject=f"【Dream Log - {contact_type}】{subject}",
            message=email_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['warpoint377@gmail.com'],
            fail_silently=False,
        )
        
        logger.info(f"成功发送{contact_type}邮件: {subject} (来自: {from_email})")
        return {
            'success': True,
            'message': f'{contact_type}邮件发送成功'
        }
        
    except Exception as e:
        logger.error(f"发送{contact_type}邮件失败: {str(e)} (来自: {from_email})")
        raise self.retry(countdown=60, exc=e)
