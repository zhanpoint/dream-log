import api from '../api/index';
import tokenManager from './tokenManager';

/**
 * 用户资料管理服务
 * 处理用户资料相关的操作
 */
export const profileManager = {
    /**
     * 更新用户信息
     * @param {Object} userData - 用户数据
     * @returns {Promise} - API响应
     */
    updateUserProfile: async (userData) => {
        const response = await api.put('/auth/profile/', userData);

        if (response.data.code === 200 && response.data.data) {
            tokenManager.setUserData(response.data.data);
        }

        return response;
    },

    /**
     * 获取用户资料详情
     * @returns {Promise} - API响应
     */
    getUserProfile: async () => {
        return api.get('/auth/profile/');
    }
};

export default profileManager; 