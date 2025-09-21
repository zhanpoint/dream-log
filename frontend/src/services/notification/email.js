import api from '../api';

/**
 * 邮箱通知服务
 */
export const emailService = {
    /**
     * 发送邮箱验证码
     * @param {string} email - 邮箱地址
     * @param {string} scene - 使用场景 (register, login, reset_password)
     * @returns {Promise} - API响应
     */
    sendVerificationCode: async (email, scene = 'register') => {
        const response = await api.post('/verifications/email/', {
            email,
            scene
        });
        return response;
    },

    /**
     * 验证邮箱格式
     * @param {string} email - 邮箱地址
     * @returns {boolean} 是否为有效邮箱
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * 格式化邮箱地址（转为小写）
     * @param {string} email - 邮箱地址
     * @returns {string} 格式化后的邮箱地址
     */
    formatEmail(email) {
        return email ? email.toLowerCase().trim() : '';
    }
};

export default emailService; 