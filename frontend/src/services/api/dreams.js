import apiClient from './client';

// 使用别名保持向后兼容
const api = apiClient;

/**
 * 梦境相关API服务
 * TODO: 考虑将这些服务统一到 api.js 中，以便更好地管理和复用
 */
const dreamService = {
    /**
     * 获取我的梦境列表
     */
    getMyDreams: async () => {
        const response = await api.get('/dreams/');
        const dreamsData = response.data.results || response.data;
        return Array.isArray(dreamsData) ? dreamsData : [];
    },

    /**
     * 获取梦境分类列表
     */
    getCategories: async () => {
        const response = await api.get('/dreams/categories/');
        return response.data;
    },

    /**
     * 获取标签列表
     */
    getTags: async () => {
        const response = await api.get('/dreams/tags/');
        return response.data;
    },

    /**
     * 搜索梦境
     * @param {Object} params - 搜索参数
     */
    searchDreams: async (params) => {
        const response = await api.get('/dreams/search/', { params });
        return response.data;
    },
};

export default dreamService; 