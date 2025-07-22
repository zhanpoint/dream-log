/**
 * 前端功能开关配置
 * 采用应用启动时初始化，后续同步获取的模式
 * 初始化过程是幂等的，可防止在React.StrictMode中重复请求
 */

// 默认的功能开关配置（后备配置）
const DEFAULT_FEATURE_FLAGS = {
    SMS_SERVICE_ENABLED: true,
    EMAIL_SERVICE_ENABLED: true,
    PASSWORD_LOGIN_ENABLED: true,
};

// 运行时功能开关配置
let featureFlags = { ...DEFAULT_FEATURE_FLAGS };

// 用于确保初始化只执行一次的Promise
let initializePromise = null;

/**
 * 初始化功能开关（幂等）
 * 在应用启动时调用，即使多次调用也只会发起一次网络请求
 */
export const initializeFeatureFlags = () => {
    if (!initializePromise) {
        initializePromise = fetch('/api/system/features/')
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('网络响应错误');
            })
            .then(result => {
                if (result.code === 200 && result.data) {
                    featureFlags = { ...DEFAULT_FEATURE_FLAGS, ...result.data };
                } else {
                    throw new Error('API返回数据格式错误');
                }
            })
            .catch(error => {
                console.warn(`无法从后端获取功能开关，将使用默认配置: ${error.message}`);
                // 如果获取失败，则使用默认配置
                featureFlags = { ...DEFAULT_FEATURE_FLAGS };
            });
    }
    return initializePromise;
};

/**
 * 检查功能是否启用（同步）
 * @param {string} feature - 功能名称
 * @returns {boolean} - 是否启用
 */
export const isFeatureEnabled = (feature) => {
    return !!featureFlags[feature];
};

/**
 * 获取可用的登录方式（同步）
 * @returns {Array} - 可用的登录方式列表
 */
export const getAvailableLoginMethods = () => {
    const methods = [];
    if (isFeatureEnabled('PASSWORD_LOGIN_ENABLED')) methods.push('password');
    if (isFeatureEnabled('SMS_SERVICE_ENABLED')) methods.push('sms');
    if (isFeatureEnabled('EMAIL_SERVICE_ENABLED')) methods.push('email');
    return methods;
};

/**
 * 获取可用的注册方式（同步）
 * @returns {Array} - 可用的注册方式列表
 */
export const getAvailableRegisterMethods = () => {
    const methods = [];
    if (isFeatureEnabled('SMS_SERVICE_ENABLED')) methods.push('phone');
    if (isFeatureEnabled('EMAIL_SERVICE_ENABLED')) methods.push('email');
    return methods;
};

/**
 * 获取可用的密码重置方式（同步）
 * @returns {Array} - 可用的密码重置方式列表
 */
export const getAvailableResetMethods = () => {
    const methods = [];
    if (isFeatureEnabled('SMS_SERVICE_ENABLED')) methods.push('phone');
    if (isFeatureEnabled('EMAIL_SERVICE_ENABLED')) methods.push('email');
    return methods;
};