import axios from 'axios';

// 创建Axios实例
const apiClient = axios.create({
    baseURL: '/api',
    // 请求超时时间
    timeout: 5000,

    // 请求头
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

export default apiClient; 