"""
邮件发送任务 (Arq)
"""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_email_template(purpose: str, code: str) -> tuple[str, str]:
    """
    获取邮件模板
    
    Returns:
        tuple: (text_content, html_content)
    """
    purpose_config = {
        "signup": {
            "title": "欢迎注册 Dream Log",
            "action": "完成注册",
            "description": "感谢您注册 Dream Log，请使用以下验证码完成注册：",
        },
        "login": {
            "title": "登录验证码",
            "action": "完成登录",
            "description": "您正在登录 Dream Log，请使用以下验证码完成登录：",
        },
        "reset": {
            "title": "重置密码验证码",
            "action": "重置密码",
            "description": "您正在重置 Dream Log 账户密码，请使用以下验证码完成重置：",
        },
    }
    
    config = purpose_config.get(purpose, purpose_config["signup"])
    
    # 纯文本内容
    text_content = f"""
{config['title']}

{config['description']}

验证码: {code}

此验证码 5 分钟内有效，请勿泄露给他人。

如果这不是您的操作，请忽略此邮件。

---
Dream Log 团队
记录和探索你的梦境世界
    """.strip()
    
    # HTML 内容
    html_content = f"""
<!DOCTYPE html>
<html lang="cn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{config['title']}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                                Dream Log
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                                {config['title']}
                            </h2>
                            
                            <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                {config['description']}
                            </p>
                            
                            <!-- Verification Code -->
                            <div style="text-align: center; margin: 40px 0;">
                                <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                    <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                        {code}
                                    </div>
                                </div>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                                此验证码 <strong style="color: #667eea;">5 分钟</strong>内有效，请勿泄露给他人。
                            </p>
                            
                            <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                                如果这不是您的操作，请忽略此邮件。
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px; text-align: center; line-height: 1.6;">
                                Dream Log 团队
                            </p>
                            <p style="margin: 0; color: #cccccc; font-size: 12px; text-align: center;">
                                记录和探索你的梦境世界
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """.strip()
    
    return text_content, html_content


async def send_verification_email(
    ctx: dict,
    email: str,
    code: str,
    purpose: str
) -> dict:
    """
    发送验证码邮件 (Arq 任务)
    
    Args:
        ctx: Arq context
        email: 目标邮箱
        code: 验证码
        purpose: 场景 (signup/login/reset)
    
    Returns:
        dict: 发送结果
    """
    try:
        # 获取邮件模板
        text_content, html_content = get_email_template(purpose, code)
        
        # 创建邮件
        message = MIMEMultipart("alternative")
        message["Subject"] = {
            "signup": "Dream Log - 注册验证码",
            "login": "Dream Log - 登录验证码",
            "reset": "Dream Log - 重置密码验证码",
        }.get(purpose, "Dream Log - 验证码")
        
        message["From"] = settings.smtp_user
        message["To"] = email
        
        # 添加文本和 HTML 部分
        text_part = MIMEText(text_content, "plain", "utf-8")
        html_part = MIMEText(html_content, "html", "utf-8")
        message.attach(text_part)
        message.attach(html_part)
        
        # 发送邮件
        use_tls = settings.smtp_use_ssl
        start_tls = settings.smtp_use_tls if not use_tls else False
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            use_tls=use_tls,
            start_tls=start_tls,
        )
        
        logger.info(f"验证码邮件发送成功: {email}, 场景: {purpose}")
        return {"success": True, "email": email}
        
    except Exception as e:
        logger.error(f"发送邮件失败: {email}, 错误: {str(e)}")
        raise  # Arq 会自动重试
