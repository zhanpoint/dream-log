import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { Alert, AlertDescription } from './alert';
import { uploadImage, isValidImageFile } from '@/services/oss';
import { cn } from '@/lib/utils';

const ImageUpload = ({
    onUploadSuccess,
    onUploadError,
    maxSize = 10 * 1024 * 1024, // 10MB
    accept = "image/*",
    multiple = false,
    className = "",
    disabled = false,
    showPreview = true,
    placeholder = "点击或拖拽图片到此处上传"
}) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [preview, setPreview] = useState(null);

    const fileInputRef = useRef(null);

    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;

        if (!isValidImageFile(file)) {
            const errorMsg = '请选择有效的图片文件（JPG、PNG、GIF、WebP）';
            setError(errorMsg);
            onUploadError?.(errorMsg);
            return;
        }

        if (file.size > maxSize) {
            const errorMsg = `文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`;
            setError(errorMsg);
            onUploadError?.(errorMsg);
            return;
        }

        setError('');
        setUploading(true);
        setProgress(0);

        if (showPreview) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target.result);
            reader.readAsDataURL(file);
        }

        try {
            const result = await uploadImage(file, (progressValue) => {
                setProgress(progressValue);
            });

            setUploading(false);
            setProgress(100);
            onUploadSuccess?.(result);

            setTimeout(() => {
                setPreview(null);
                setProgress(0);
            }, 1000);

        } catch (error) {
            setUploading(false);
            setProgress(0);
            setPreview(null);
            const errorMsg = error.message || '上传失败';
            setError(errorMsg);
            onUploadError?.(errorMsg);
        }
    }, [maxSize, onUploadSuccess, onUploadError, showPreview]);

    const handleMultipleFiles = useCallback(async (files) => {
        if (!multiple) {
            await handleFileUpload(files[0]);
            return;
        }

        for (const file of files) {
            await handleFileUpload(file);
        }
    }, [handleFileUpload, multiple]);

    const handleFileSelect = useCallback((event) => {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            handleMultipleFiles(files);
        }
        event.target.value = '';
    }, [handleMultipleFiles]);

    const handleDragOver = useCallback((event) => {
        event.preventDefault();
        if (!disabled) {
            setDragOver(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback((event) => {
        event.preventDefault();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((event) => {
        event.preventDefault();
        setDragOver(false);

        if (disabled) return;

        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) {
            handleMultipleFiles(files);
        }
    }, [disabled, handleMultipleFiles]);

    const handlePaste = useCallback((event) => {
        if (disabled) return;

        const items = Array.from(event.clipboardData.items);
        const imageItems = items.filter(item => item.type.startsWith('image/'));

        if (imageItems.length > 0) {
            const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
            if (files.length > 0) {
                handleMultipleFiles(files);
            }
        }
    }, [disabled, handleMultipleFiles]);

    const handleClick = useCallback(() => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, [disabled]);

    const handleCancel = useCallback(() => {
        setUploading(false);
        setProgress(0);
        setPreview(null);
        setError('');
    }, []);

    return (
        <div className={cn("w-full", className)}>
            <div
                className={cn(
                    "relative border-2 border-dashed rounded-lg p-6 transition-colors",
                    "hover:border-primary/50 hover:bg-accent/50",
                    dragOver && "border-primary bg-primary/10",
                    disabled && "opacity-50 cursor-not-allowed",
                    !disabled && "cursor-pointer",
                    error && "border-destructive"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                onPaste={handlePaste}
                tabIndex={0}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={disabled}
                />

                {preview && showPreview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                        <img
                            src={preview}
                            alt="预览"
                            className="max-h-32 max-w-32 object-contain rounded"
                        />
                    </div>
                )}

                {/* 上传内容 */}
                <div className="flex flex-col items-center justify-center space-y-3">
                    {uploading ? (
                        <>
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <div className="text-sm text-muted-foreground">
                                上传中... {progress}%
                            </div>
                            <Progress value={progress} className="w-full max-w-xs" />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancel();
                                }}
                            >
                                <X className="h-4 w-4 mr-1" />
                                取消
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-center w-12 h-12 bg-accent rounded-full">
                                <Upload className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-medium">
                                    {placeholder}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    支持 JPG、PNG、GIF、WebP 格式，最大 {Math.round(maxSize / 1024 / 1024)}MB
                                </div>
                            </div>
                            <Button variant="outline" size="sm">
                                <ImageIcon className="h-4 w-4 mr-2" />
                                选择图片
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="mt-3">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!uploading && !error && (
                <div className="text-xs text-muted-foreground mt-2 text-center">
                    支持拖拽、粘贴或点击上传图片
                </div>
            )}
        </div>
    );
};

export default ImageUpload; 