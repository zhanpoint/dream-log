import smsService from './sms';
import emailService from './email';
// 未来可能添加的其他通知服务
// import pushService from './push';

/**
 * 统一通知服务
 * 整合所有通知相关功能
 */
export const notificationService = {
    // 短信通知服务
    sms: smsService,
    email: emailService,
};

export default notificationService;

export { default as sms } from './sms';
export { default as email } from './email'; 