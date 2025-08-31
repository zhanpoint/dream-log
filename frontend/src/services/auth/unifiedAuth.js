import api from '../api/index';
import { tokenManager } from './tokenManager';
import { toast } from 'sonner';

/**
 * 统一认证服务类
 * 整合所有认证相关的API请求逻辑，确保请求行为的一致性
 */
class UnifiedAuthService {
    /**
     * 统一登录方法
     * @param {string} loginType - 登录类型: 'password' | 'sms' | 'email'
     * @param {Object} credentials - 登录凭据
     * @returns {Promise<{success: boolean, message?: string, data?: Object, field?: string}>}
     */
    async login(loginType, credentials) {
        try {
            let requestData = {};

            // 根据登录类型构造请求数据
            switch (loginType) {
                case 'password':
                    requestData = {
                        username: credentials.username,
                        password: credentials.password
                    };
                    break;
                case 'sms':
                    requestData = {
                        phone_number: credentials.phone,
                        code: credentials.verificationCode
                    };
                    break;
                case 'email':
                    requestData = {
                        email: credentials.email,
                        code: credentials.verificationCode
                    };
                    break;
                default:
                    return {
                        success: false,
                        message: '不支持的登录方式'
                    };
            }

            // 发送登录请求
            const response = await api.post('/auth/sessions/', requestData);

            // 统一处理响应
            return this._handleAuthResponse(response, `${loginType}_login`);
        } catch (error) {
            return this._handleAuthError(error, `${loginType}_login`);
        }
    }

    /**
     * 统一注册方法
     * @param {string} registerType - 注册类型: 'sms' | 'email'
     * @param {Object} userData - 用户数据
     * @returns {Promise<{success: boolean, message?: string, data?: Object, field?: string}>}
     */
    async register(registerType, userData) {
        try {
            let requestData = {};

            // 根据注册类型构造请求数据
            switch (registerType) {
                case 'sms':
                    requestData = {
                        username: userData.username,
                        password: userData.password,
                        phone_number: userData.phone,
                        code: userData.verificationCode
                    };
                    break;
                case 'email':
                    requestData = {
                        username: userData.username,
                        password: userData.password,
                        email: userData.email,
                        code: userData.verificationCode
                    };
                    break;
                default:
                    return {
                        success: false,
                        message: '不支持的注册方式'
                    };
            }

            // 发送注册请求
            const response = await api.post('/users/', requestData);

            // 统一处理响应
            return this._handleAuthResponse(response, `${registerType}_register`);
        } catch (error) {
            return this._handleAuthError(error, `${registerType}_register`);
        }
    }

    /**
     * 统一密码重置方法
     * @param {string} method - 重置方式: 'current_password' | 'phone' | 'email'
     * @param {Object} resetData - 重置数据
     * @returns {Promise<{success: boolean, message?: string, field?: string}>}
     */
    async resetPassword(method, resetData) {
        try {
            let requestData = { method, newPassword: resetData.newPassword };

            // 根据重置方式构造请求数据
            switch (method) {
                case 'current_password':
                    requestData.currentPassword = resetData.currentPassword;
                    // 添加用户标识
                    if (resetData.username) requestData.username = resetData.username;
                    if (resetData.phone) requestData.phone = resetData.phone;
                    if (resetData.email) requestData.email = resetData.email;
                    break;
                case 'phone':
                    requestData.phone = resetData.phone;
                    requestData.code = resetData.verificationCode;
                    break;
                case 'email':
                    requestData.email = resetData.email;
                    requestData.code = resetData.verificationCode;
                    break;
                default:
                    return {
                        success: false,
                        message: '不支持的重置方式'
                    };
            }

            // 发送重置请求
            const response = await api.put('/users/me/password/', requestData);

            // 处理重置响应
            if (response.data?.code === 200) {
                return {
                    success: true,
                    message: response.data.message || '密码重置成功'
                };
            } else {
                return {
                    success: false,
                    message: response.data?.message || '密码重置失败'
                };
            }
        } catch (error) {
            return this._handleAuthError(error, `${resetType}_reset`);
        }
    }

    /**
     * 用户登出
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            const accessToken = tokenManager.getAccessToken();
            const refreshToken = tokenManager.getRefreshToken();

            if (accessToken) {
                // 向后端发送注销请求
                await api.delete('/auth/sessions/', { data: { refresh: refreshToken } });
            }
        } catch (error) {
            console.error('退出登录请求失败:', error);
            // 即使API请求失败，也继续执行本地注销流程
        } finally {
            // 清除本地状态
            tokenManager.clearAll();
            // 触发登出事件
            window.dispatchEvent(new CustomEvent('auth:logout'));
            // 直接重定向到首页
            window.location.href = '/';
        }
    }

    /**
     * 刷新访问令牌
     * @returns {Promise<string>} 新的访问令牌
     */
    async refreshToken() {
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken) {
            throw new Error('没有刷新令牌可用');
        }

        try {
            const response = await api.post('/auth/tokens/refresh/', {
                refresh: refreshToken
            });

            if (response.data?.access) {
                tokenManager.setTokens(response.data.access, response.data.refresh || refreshToken);
                return response.data.access;
            } else {
                throw new Error('无效的响应格式');
            }
        } catch (error) {
            console.error('刷新令牌失败:', error);

            if (error.response?.status === 401 || error.response?.status === 400) {
                this.logout();
                window.dispatchEvent(new CustomEvent('auth:required'));
            }
            throw error;
        }
    }

    /**
     * 检查用户是否已认证
     * @returns {boolean} 认证状态
     */
    isAuthenticated() {
        return tokenManager.isAccessTokenValid();
    }

    /**
     * 获取当前用户信息
     * @returns {Object|null} 用户数据
     */
    getCurrentUser() {
        return tokenManager.getUserData();
    }

    /**
     * 统一处理认证响应
     * @private
     */
    _handleAuthResponse(response, operationType) {
        const data = response.data;

        if (data?.code === 200 || data?.code === 201) {
            // 成功响应
            const result = {
                success: true,
                message: data.message || '操作成功'
            };

            // 如果是登录或注册操作，保存令牌和用户数据
            if (operationType.includes('login') || operationType.includes('register')) {
                // 后端现在返回扁平化结构：data={ id, username, avatar, ..., access, refresh }
                const access = data.data?.access || data.access;
                const refresh = data.data?.refresh || data.refresh;

                // 从响应数据中提取用户信息（排除 access 和 refresh）
                const userData = data.data ? { ...data.data } : {};
                delete userData.access;
                delete userData.refresh;

                // 确保必要字段存在
                if (access && refresh && userData.id) {
                    tokenManager.setTokens(access, refresh);
                    tokenManager.setUserData(userData);
                    result.data = userData;
                } else {
                    console.error('认证响应缺少必需的令牌或用户字段:', { access: !!access, refresh: !!refresh, userId: userData.id, userData });
                    return {
                        success: false,
                        message: '认证响应格式错误'
                    };
                }
            }

            return result;
        } else {
            // 失败响应
            return {
                success: false,
                message: data?.message || '操作失败'
            };
        }
    }

    /**
 * 统一处理认证错误
 * @private
 */
    _handleAuthError(error, operationType) {
        console.error(`${operationType}操作失败:`, error);

        // 仅处理后端返回的错误信息
        if (error.response?.data) {
            const errorData = error.response.data;

            // 处理后端错误格式
            if (errorData.errors && typeof errorData.errors === 'object') {
                // 处理 DRF non_field_errors
                if (errorData.errors.non_field_errors && Array.isArray(errorData.errors.non_field_errors)) {
                    return {
                        success: false,
                        message: errorData.errors.non_field_errors[0]
                    };
                }

                // 处理字段级别的错误
                const firstErrorField = Object.keys(errorData.errors)[0];
                let firstErrorMessage = errorData.errors[firstErrorField];

                // 如果是数组，取第一个元素；如果是ErrorDetail对象，取string属性
                if (Array.isArray(firstErrorMessage)) {
                    firstErrorMessage = firstErrorMessage[0];
                }
                if (typeof firstErrorMessage === 'object' && firstErrorMessage.string) {
                    firstErrorMessage = firstErrorMessage.string;
                }

                return {
                    success: false,
                    message: firstErrorMessage,
                    field: firstErrorField === 'non_field_errors' ? undefined : firstErrorField
                };
            }

            // 处理通用错误消息
            if (errorData.message) {
                return {
                    success: false,
                    message: errorData.message
                };
            }
        }

        // 默认错误处理
        return {
            success: false,
            message: '操作失败，请稍后重试'
        };
    }
}

// 创建单例实例
const unifiedAuthService = new UnifiedAuthService();

export default unifiedAuthService;
export { UnifiedAuthService }; 