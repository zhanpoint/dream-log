import apiClient from '../api/client';

class OSSUploadService {
    constructor() {
        this.uploadMethod = 'presigned';
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    async getUploadSignature(filename, contentType = 'image/jpeg') {
        const sanitizedFilename = this.sanitizeFilename(filename);
        const response = await apiClient.post('/files/upload-signature/', {
            filename: sanitizedFilename,
            content_type: contentType
        });
        return response.data;
    }

    async getSTSToken() {
        const response = await apiClient.post('/files/sts-token/');
        return response.data;
    }

    sanitizeFilename(filename) {
        if (!filename) return `image_${Date.now()}.jpg`;

        const lastDotIndex = filename.lastIndexOf('.');
        const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
        const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '.jpg';

        const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
        return `${sanitizedName}${extension}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async uploadWithSignature(file, onProgress = null) {
        const signature = await this.getUploadSignature(file.name, file.type);

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await this.performUpload(file, signature, onProgress);
                return result;
            } catch (error) {
                if (attempt === this.maxRetries) {
                    throw error;
                }
                await this.delay(this.retryDelay * attempt);
            }
        }
    }

    async performUpload(file, signature, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    onProgress(progress);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({
                        url: signature.access_url,
                        fileKey: signature.file_key,
                        size: file.size,
                        name: file.name
                    });
                } else {
                    reject(new Error(`上传失败，状态码: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('网络连接错误'));
            });

            xhr.addEventListener('timeout', () => {
                reject(new Error('上传超时'));
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('上传被中止'));
            });

            xhr.open('PUT', signature.upload_url);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.timeout = 120000;
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

    async deleteFile(fileKey) {
        await apiClient.delete('/files/delete/', {
            data: { file_key: fileKey }
        });
        return true;
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
export const isValidImageFile = (file) => ossUploadService.isValidImageFile(file);

export default ossUploadService; 