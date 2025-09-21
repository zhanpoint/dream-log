import React, { useState, useRef } from 'react';
import { Camera, Upload, X, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, getUserAvatarUrl } from '@/utils/avatar';
import notification from '@/utils/notification';
import { profileManager } from '@/services/auth/profileManager';
import { uploadAvatar } from '@/services/oss';
import { useTranslation } from 'react-i18next';

/**
 * 头像上传组件
 * 采用现代企业级设计风格
 */
const AvatarUpload = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const currentAvatarUrl = getUserAvatarUrl(user);
    const displayUrl = previewUrl || currentAvatarUrl;
    const userInitials = getInitials(user?.username);

    /**
     * 验证文件格式和大小
     */
    const validateFile = (file) => {
        const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
        const maxSize = 2 * 1024 * 1024; // 2MB

        if (!allowedTypes.includes(file.type)) {
            notification.error(t('settings:avatar.errors.unsupportedFormat'));
            return false;
        }

        if (file.size > maxSize) {
            notification.error(t('settings:avatar.errors.fileTooLarge'));
            return false;
        }

        return true;
    };

    /**
     * 处理文件选择
     */
    const handleFileSelect = (file) => {
        if (!validateFile(file)) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    /**
     * 处理文件输入变化
     */
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    /**
     * 处理拖拽上传
     */
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    /**
     * 处理文件拖放
     */
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files?.[0]) {
            handleFileSelect(files[0]);
        }
    };

    /**
     * 重置头像
     */
    const handleReset = () => {
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    /**
     * 触发文件选择
     */
    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    /**
     * 保存头像
     */
    const handleSave = async () => {
        if (!previewUrl) return;

        setIsUploading(true);
        try {
            const file = fileInputRef.current?.files?.[0];
            if (!file) {
                notification.error(t('settings:avatar.errors.selectFile'));
                setIsUploading(false);
                return;
            }

            const uploadResult = await uploadAvatar(file);
            const avatarUrl = uploadResult?.url;
            if (!avatarUrl) {
                throw new Error(t('settings:avatar.errors.noUrl'));
            }

            const resp = await profileManager.updateUserProfile({ avatar: avatarUrl });
            if (resp?.data?.code === 200) {
                // 保存成功后重置本地预览并隐藏按钮
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
            notification.success(t('settings:avatar.success'));
        } catch (error) {
            notification.error(t('settings:avatar.failed') + ': ' + (error.message || t('common.retry')));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">{t('settings:avatar.title')}</h3>
            </div>

            <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                        {/* 当前头像显示 */}
                        <div className="relative">
                            <Avatar className="w-20 h-20 border-2 border-border">
                                <AvatarImage
                                    src={displayUrl}
                                    alt={user?.username || t('settings:avatar.userAvatar')}
                                    className="object-cover"
                                />
                                <AvatarFallback className="text-lg">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>

                            {/* 头像上的相机图标 */}
                            <Button
                                size="sm"
                                variant="secondary"
                                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full p-0 shadow-md hover:shadow-lg transition-shadow"
                                onClick={triggerFileSelect}
                            >
                                <Camera className="h-3 w-3" />
                            </Button>
                        </div>

                        {/* 上传区域 */}
                        <div className="flex-1 space-y-4">
                            {/* 拖拽上传区域 */}
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-primary/50 ${dragActive ? 'border-primary bg-primary/5' : 'border-border'
                                    }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={triggerFileSelect}
                            >
                                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">{t('settings:avatar.uploadHint')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('settings:avatar.formatHint')}
                                    </p>
                                </div>
                            </div>

                            {/* 隐藏的文件输入 */}
                            <Input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpg,image/jpeg,image/webp"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {/* 操作按钮 */}
                            {previewUrl && (
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        className="gap-2"
                                    >
                                        <X className="h-4 w-4" />
                                        {t('common:cancel')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={isUploading}
                                        className="gap-2"
                                    >
                                        <Upload className="h-4 w-4" />
                                        {isUploading ? t('settings:avatar.uploading') : t('settings:avatar.saveAvatar')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AvatarUpload;