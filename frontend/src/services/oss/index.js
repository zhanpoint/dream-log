import apiClient from '../api/client';
import notification from '../../utils/notification';

// 图片处理工具类
class ImageProcessor {
    /**
     * 压缩图片
     * @param {File} file - 原始图片文件
     * @param {Object} options - 压缩选项
     * @returns {Promise<File>} - 压缩后的图片文件
     */
    static async compressImage(file, options = {}) {
        const {
            maxWidth = 1920,
            maxHeight = 1080,
            quality = 0.85,
            maxSizeKB = 1024, // 1MB
        } = options;

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    // 计算压缩后的尺寸
                    let { width, height } = img;
                    const ratio = Math.min(maxWidth / width, maxHeight / height);

                    if (ratio < 1) {
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // 绘制压缩后的图片
                    ctx.drawImage(img, 0, 0, width, height);

                    // 转换为blob，如果文件过大则降低质量
                    const tryCompress = (currentQuality) => {
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error('图片压缩失败'));
                                return;
                            }

                            // 如果文件仍然过大且质量可以继续降低，则递归压缩
                            if (blob.size > maxSizeKB * 1024 && currentQuality > 0.3) {
                                tryCompress(currentQuality - 0.1);
                                return;
                            }

                            // 创建新的File对象
                            const compressedFile = new File([blob], file.name, {
                                type: file.type,
                                lastModified: Date.now(),
                            });

                            resolve(compressedFile);
                        }, file.type, currentQuality);
                    };

                    tryCompress(quality);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * 生成图片缩略图
     * @param {File} file - 图片文件
     * @returns {Promise<string>} - base64缩略图
     */
    static async generateThumbnail(file, size = 200) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                const { width, height } = img;
                const scale = Math.min(size / width, size / height);

                canvas.width = width * scale;
                canvas.height = height * scale;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };

            img.onerror = () => reject(new Error('缩略图生成失败'));
            img.src = URL.createObjectURL(file);
        });
    }
}

class OSSUploadService {
    constructor() {
        this.uploadMethod = 'presigned';
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    async getSTSToken() {
        const response = await apiClient.post('/files/sts-token/');
        return response.data;
    }

    /**
     * 当OSS上传成功后，通知后端创建图片记录
     * @param {string} fileKey - 文件在OSS上的key
     * @param {string} accessUrl - 图片在OSS上的可访问URL
     * @returns {Promise<object>} - 包含最终图片信息的Promise
     */
    async completeUpload(fileKey, accessUrl) {
        try {
            const response = await apiClient.post('/files/complete-upload/', {
                file_key: fileKey,
                access_url: accessUrl,
            });
            return response.data;
        } catch (error) {
            notification.error('无法确认图片上传，URL可能不会被保存。');
            throw error;
        }
    }


    /**
 * 核心流程：预处理 -> 获取签名 -> 上传文件 -> 确认上传
 * @param {File} file - 要上传的文件对象
 * @param {Function} onProgress - 进度回调函数
 * @returns {Promise<object>} - 包含最终图片信息的Promise
 */
    async uploadWithSignature(file, onProgress = null) {
        const startTime = Date.now();

        try {
            // 1. 预处理图片（压缩优化）
            onProgress?.({ step: 'preprocessing', progress: 0, message: '正在优化图片...' });

            let processedFile = file;
            if (this.isValidImageFile(file) && file.size > 500 * 1024) { // 大于500KB才压缩
                try {
                    processedFile = await ImageProcessor.compressImage(file, {
                        maxWidth: 1920,
                        maxHeight: 1080,
                        quality: 0.85,
                        maxSizeKB: 1024
                    });
                    console.log(`图片压缩: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
                } catch (compressionError) {
                    console.warn('图片压缩失败，使用原图:', compressionError);
                    processedFile = file;
                }
            }

            onProgress?.({ step: 'preprocessing', progress: 100, message: '图片优化完成' });

            // 2. 从后端获取上传签名和file_key
            onProgress?.({ step: 'signature', progress: 0, message: '获取上传签名...' });

            const response = await apiClient.post('/files/upload-signature/', {
                file_name: processedFile.name,
                content_type: processedFile.type,
            });

            const signatureData = response.data;
            if (!signatureData || !signatureData.upload_url || !signatureData.file_key) {
                throw new Error('获取上传签名失败或签名数据不完整');
            }

            onProgress?.({ step: 'signature', progress: 100, message: '签名获取成功' });

            // 3. 使用签名将文件上传到OSS
            onProgress?.({ step: 'upload', progress: 0, message: '上传文件中...' });

            await this.performUpload(signatureData.upload_url, processedFile, processedFile.type,
                (uploadProgress) => {
                    onProgress?.({
                        step: 'upload',
                        progress: uploadProgress,
                        message: `上传中... ${uploadProgress}%`
                    });
                }
            );

            // 4. 通知后端上传已完成，并创建数据库记录
            onProgress?.({ step: 'complete', progress: 0, message: '确认上传状态...' });

            const finalImageRecord = await this.completeUpload(signatureData.file_key, signatureData.access_url);

            onProgress?.({ step: 'complete', progress: 100, message: '上传完成！' });

            const totalTime = Date.now() - startTime;
            console.log(`图片上传总耗时: ${totalTime}ms`);

            notification.success(`图片上传成功！耗时 ${(totalTime / 1000).toFixed(1)}s`);

            // 返回完整的图片记录，其中包含可用的url
            return finalImageRecord;

        } catch (error) {
            const errorStep = error.step || 'unknown';
            const errorMessages = {
                'preprocessing': '图片预处理失败',
                'signature': '获取上传签名失败',
                'upload': '文件上传到云存储失败',
                'complete': '确认上传状态失败',
                'unknown': '上传过程中发生未知错误'
            };

            notification.error(errorMessages[errorStep] || errorMessages.unknown);
            onProgress?.({ step: errorStep, progress: 0, message: errorMessages[errorStep], error: true });
            throw error;
        }
    }

    /**
     * 执行文件上传到指定的预签名URL
     * @param {string} uploadUrl - 预签名的上传URL
     * @param {File} file - 文件对象
     * @param {string} contentType - 文件的MIME类型
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<void>}
     */
    async performUpload(uploadUrl, file, contentType, onProgress = null) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // 上传进度监听
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    onProgress(progress);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    const error = new Error(`上传失败，状态码: ${xhr.status}`);
                    error.step = 'upload';
                    reject(error);
                }
            });

            xhr.addEventListener('error', () => {
                const error = new Error('网络连接错误');
                error.step = 'upload';
                reject(error);
            });

            xhr.addEventListener('timeout', () => {
                const error = new Error('上传超时');
                error.step = 'upload';
                reject(error);
            });

            xhr.addEventListener('abort', () => {
                const error = new Error('上传被中止');
                error.step = 'upload';
                reject(error);
            });

            // 配置请求
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');

            // 根据文件大小调整超时时间
            const timeoutPerMB = 30000; // 每MB 30秒
            const fileSizeMB = file.size / (1024 * 1024);
            xhr.timeout = Math.max(60000, Math.min(300000, fileSizeMB * timeoutPerMB)); // 最少1分钟，最多5分钟

            xhr.send(file);
        });
    }

    async uploadImage(file, onProgress = null) {
        if (!this.isValidImageFile(file)) {
            throw new Error('请选择有效的图片文件（JPG、PNG、GIF、WebP）');
        }

        if (file.size > 10 * 1024 * 1024) {
            throw new Error('图片文件大小不能超过10MB');
        }

        return await this.uploadWithSignature(file, onProgress);
    }

    async markImagesForDeletion(imageUrls) {
        try {
            const response = await apiClient.post('/files/mark-for-deletion/', {
                image_urls: imageUrls
            });
            return response.data;
        } catch (error) {
            notification.error('标记图片待删除失败');
            throw error;
        }
    }

    async deleteFile(fileKey) {
        try {
            await apiClient.delete('/files/delete/', {
                data: {
                    file_key: fileKey,
                }
            });
            return true;
        } catch (error) {
            notification.error('删除文件失败');
            throw error;
        }
    }

    async listFiles(prefix = '', maxKeys = 100) {
        const response = await apiClient.get('/files/', {
            params: {
                prefix,
                max_keys: maxKeys
            }
        });
        return response.data;
    }

    isValidImageFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        return allowedTypes.includes(file.type);
    }

    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
    }
}

const ossUploadService = new OSSUploadService();

export const uploadImage = (file, onProgress) => ossUploadService.uploadImage(file, onProgress);
export const listFiles = (prefix, maxKeys) => ossUploadService.listFiles(prefix, maxKeys);
export const deleteFile = (fileKey) => ossUploadService.deleteFile(fileKey);
export const markImagesForDeletion = (imageUrls) => ossUploadService.markImagesForDeletion(imageUrls);
export const isValidImageFile = (file) => ossUploadService.isValidImageFile(file);
export const uploadWithSignature = (file) => ossUploadService.uploadWithSignature(file);
export const completeUpload = (fileKey, accessUrl) => ossUploadService.completeUpload(fileKey, accessUrl);

export default ossUploadService; 