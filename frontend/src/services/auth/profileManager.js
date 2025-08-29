import api from '../api/index';
import tokenManager from './tokenManager';

/**
 * 用户资料管理服务
 * 处理用户资料相关的操作
 */
export const profileManager = {
    /**
     * 刷新用户资料并通知全局（AuthContext）
     * @returns {Promise<void>}
     */
    refreshUserProfileAndBroadcast: async () => {
        const current = tokenManager.getUserData();
        const userId = current?.id || 'me';
        const resp = await api.get(`/users/${userId}/`);
        if (resp?.data?.data) {
            tokenManager.setUserData(resp.data.data);
            try {
                window.dispatchEvent(new CustomEvent('auth:user-updated', { detail: resp.data.data }));
            } catch (_) {
                // 忽略服务端渲染或不可用窗口环境
            }
        }
        return resp;
    },
    /**
     * 更新用户信息
     * @param {Object} userData - 用户数据
     * @returns {Promise} - API响应
     */
    updateUserProfile: async (userData) => {
        // 后端统一在 /api/users/{id}/ 更新当前用户，前端无需传id
        const current = tokenManager.getUserData();
        const userId = current?.id || 'me';
        const response = await api.put(`/users/${userId}/`, userData);

        if (response.data.code === 200 && response.data.data) {
            tokenManager.setUserData(response.data.data);
            try {
                window.dispatchEvent(new CustomEvent('auth:user-updated', { detail: response.data.data }));
            } catch (_) {
                // 忽略不可用的window
            }
        }

        return response;
    },

    /**
     * 获取用户资料详情
     * @returns {Promise} - API响应
     */
    getUserProfile: async () => {
        const current = tokenManager.getUserData();
        const userId = current?.id || 'me';
        return api.get(`/users/${userId}/`);
    },

    changeEmail: async (newEmail, code) => {
        const resp = await api.post('/users/me/primary-email/', { new_email: newEmail, code });
        // 成功后刷新本地用户资料
        if (resp?.data?.code === 200) {
            await profileManager.refreshUserProfileAndBroadcast();
        }
        return resp;
    },

    // 移除单纯更新备用邮箱的接口，统一使用带验证码的接口

    /**
     * 设置备用邮箱（需要验证码）
     */
    setBackupEmailWithVerification: async (backupEmail, code) => {
        const resp = await api.put('/users/me/backup-email/', { backup_email: backupEmail, code });
        if (resp?.data?.code === 200) {
            await profileManager.refreshUserProfileAndBroadcast();
        }
        return resp;
    },

    /**
     * 修改密码（已登录状态）
     */
    /**
     * 修改密码（已登录状态）
     * @param {string|undefined} currentPassword - 当前密码（当以当前密码校验时传递）
     * @param {string} newPassword - 新密码
     * @param {{method: 'primary_email'|'backup_email', code: string}|undefined} verify - 使用邮箱验证码验证时的参数
     */
    // 已统一到 /auth/password/reset/，删除旧接口

    /**
     * 发送验证码
     */
    sendVerificationCode: async (email, scene) => {
        return api.post('/verifications/email/', { email, scene });
    }
};

export default profileManager; 