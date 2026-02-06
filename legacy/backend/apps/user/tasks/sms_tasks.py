from celery import shared_task
from apps.user.utils.sms import SMSService
import json
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_verification_sms_task(self, phone: str, code: str, template_code: str):
    """
    异步发送短信验证码任务

    Args:
        phone: 接收验证码的手机号
        code: 验证码明文
        template_code: 短信模板编码

    Returns:
        dict: 发送结果
    """
    try:
        sms_service = SMSService()
        template_param = json.dumps({'code': code})
        response = sms_service.send_sms(
            phone_numbers=phone,
            template_code=template_code,
            template_param=template_param
        )

        if response and response.get('Code') == 'OK':
            logger.info(f"短信验证码发送任务成功，手机号: {phone}")
            return {'status': 'success', 'phone': phone}
        else:
            logger.error(f"短信验证码发送任务失败，手机号: {phone}，响应: {response}")
            raise Exception("短信发送失败")

    except Exception as e:
        logger.error(f"短信验证码发送任务异常，手机号: {phone}，错误: {str(e)}")
        try:
            countdown = 30 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=countdown)
        except self.MaxRetriesExceededError:
            logger.error(f"短信验证码发送任务重试次数超限，手机号: {phone}")
            return {
                'status': 'failed',
                'message': f'短信发送失败，已达到最大重试次数: {str(e)}'
            }


