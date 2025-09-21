import api from './api';

/**
 * 联系我们/反馈建议服务 - 简化版
 */
class ContactService {
    /**
     * 提交联系我们表单
     * @param {string} message - 联系内容
     * @returns {Promise} API响应
     */
    async submitContact(message) {
        try {
            const response = await api.post('/system/contact/', { message });
            return {
                success: true,
                data: response.data,
                message: response.data.message || '联系信息提交成功'
            };
        } catch (error) {
            console.error('提交联系表单失败:', error);

            // 处理错误响应
            const errorMessage = error.response?.data?.message || '提交失败，请稍后重试';
            const errors = error.response?.data?.errors || {};

            return {
                success: false,
                message: errorMessage,
                errors: errors
            };
        }
    }

    /**
     * 提交反馈建议表单
     * @param {string} message - 反馈内容
     * @returns {Promise} API响应
     */
    async submitFeedback(message) {
        try {
            const response = await api.post('/system/feedback/', { message });
            return {
                success: true,
                data: response.data,
                message: response.data.message || '反馈建议提交成功'
            };
        } catch (error) {
            console.error('提交反馈表单失败:', error);

            // 处理错误响应
            const errorMessage = error.response?.data?.message || '提交失败，请稍后重试';
            const errors = error.response?.data?.errors || {};

            return {
                success: false,
                message: errorMessage,
                errors: errors
            };
        }
    }
}

export default new ContactService();
