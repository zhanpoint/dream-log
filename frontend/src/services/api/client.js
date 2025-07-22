import axios from 'axios';

// 创建Axios实例
const apiClient = axios.create({
    // 根据实际部署环境设置baseURL
    baseURL: '/api',
    // 请求超时时间
    timeout: 10000,

    // 请求头
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

export default apiClient; 