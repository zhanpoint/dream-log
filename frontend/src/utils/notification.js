import { toast } from "sonner";

/**
 * 消息通知工具
 * 提供统一的消息显示接口
 */
const notification = {
    /**
     * 显示成功消息
     * @param {string} message - 消息内容
     * @param {object} options - 额外选项
     */
    success: (message, options = {}) => {
        toast.success(message, {
            duration: 1500,
            ...options
        });
    },

    /**
     * 显示错误消息
     * @param {string} message - 消息内容
     * @param {object} options - 额外选项
     */
    error: (message, options = {}) => {
        toast.error(message, {
            duration: 4000,
            ...options
        });
    },

    /**
     * 显示警告消息
     * @param {string} message - 消息内容
     * @param {object} options - 额外选项
     */
    warning: (message, options = {}) => {
        toast.warning(message, {
            duration: 3500,
            ...options
        });
    },

    /**
     * 显示普通信息消息
     * @param {string} message - 消息内容
     * @param {object} options - 额外选项
     */
    info: (message, options = {}) => {
        toast.info(message, {
            duration: 3000,
            ...options
        });
    },

    /**
     * 显示带有加载状态的消息
     * @param {string} message - 消息内容
     * @param {Promise} promise - 要等待的Promise
     * @param {object} options - 加载选项
     */
    loading: (message, promise, options = {}) => {
        toast.promise(promise, {
            loading: message || '处理中...',
            success: (data) => options.success || '操作成功！',
            error: (err) => options.error || '操作失败！',
            ...options
        });
    },

    /**
     * 显示带有确认操作的消息
     * @param {string} message - 消息内容
     * @param {Function} onConfirm - 确认回调
     * @param {Function} onCancel - 取消回调
     */
    confirm: (message, onConfirm, onCancel = () => { }) => {
        toast(message, {
            action: {
                label: '确认',
                onClick: onConfirm,
            },
            cancel: {
                label: '取消',
                onClick: onCancel,
            },
            duration: 10000,
        });
    }
};

export default notification; 