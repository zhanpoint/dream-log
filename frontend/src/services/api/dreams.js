import api from './client';

/**
 * 梦境相关API服务
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
     * 获取梦境详情
     * @param {string} id - 梦境ID
     */
    getDreamDetail: async (id) => {
        const response = await api.get(`/dreams/${id}/`);
        return response.data;
    },

    /**
     * 创建新梦境
     * @param {Object} dreamData - 梦境数据
     */
    createDream: async (dreamData) => {
        const response = await api.post('/dreams/', dreamData);
        return response.data;
    },

    /**
     * 更新梦境
     * @param {string} id - 梦境ID
     * @param {Object} dreamData - 更新的梦境数据
     */
    updateDream: async (id, dreamData) => {
        const response = await api.put(`/dreams/${id}/`, dreamData);
        return response.data;
    },

    /**
     * 删除梦境
     * @param {string} id - 梦境ID
     */
    deleteDream: async (id) => {
        const response = await api.delete(`/dreams/${id}/`);
        return response.data;
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