import api from '../api/index';

/**
 * 短信通知服务
 * 负责短信发送相关功能
 */
export const smsService = {
    /**
     * 发送短信验证码
     * @param {string} phone - 手机号
     * @param {string} scene - 使用场景 (register, login, reset_password)
     * @returns {Promise} - API响应
     */
    sendVerificationCode: async (phone, scene = 'register') => {
        return api.post('/verifications/sms/', { phone, scene });
    }
};

export default smsService; 