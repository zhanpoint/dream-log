import React, { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useI18nContext } from '@/contexts/I18nContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageResize from 'tiptap-extension-resize-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import CharacterCount from '@tiptap/extension-character-count';
import FileHandler from '@tiptap/extension-file-handler';
import {
    Bold, Italic, Strikethrough, List, ListOrdered,
    Undo, Redo, Upload, Minus, Maximize, Minimize,
    Paintbrush, GripVertical, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DreamSeparator } from './extensions/dream-separator';
import { MiniCanvas } from './extensions/mini-canvas';
import { ResizableEditor } from './extensions/resizable-editor';
import notification from '@/utils/notification';

// 图片上传配置
const IMAGE_CONFIG = {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    maxSize: 5 * 1024 * 1024, // 5MB
    maxCount: 5
};

// 文本限制配置
const TEXT_CONFIG = {
    maxLength: 1000
};



// 优化的工具提示组件 - 修复层级和定位问题
const SimpleTooltip = ({ children, content, disabled = false }) => {
    const [show, setShow] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);

    if (disabled) return children;

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top, // 定位在按钮顶部
                left: rect.left + rect.width / 2 // 居中对齐
            });
        }
        setShow(true);
    };

    const handleMouseLeave = () => {
        setShow(false);
    };

    return (
        <>
            <div
                ref={triggerRef}
                className="relative inline-block"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </div>
            {show && createPortal(
                <div
                    className="simple-tooltip-portal"
                    style={{
                        position: 'fixed',
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        zIndex: 99999
                    }}
                >
                    {content}
                </div>,
                document.body
            )}
        </>
    );
};

// 全屏编辑器组件
const FullscreenEditor = ({
    editor,
    onClose,
    onImageUpload,
    characterCount,
    imageCount,
    children
}) => {
    const { t } = useI18nContext();
    const [showCanvasModal, setShowCanvasModal] = useState(false);
    const fileInputRef = useRef(null);

    // 统一图片上传处理
    const handleImageUpload = async (file, source = 'upload') => {
        if (imageCount >= IMAGE_CONFIG.maxCount) {
            notification.warning(t('common:editor.maxImagesReached', `最多只能插入${IMAGE_CONFIG.maxCount}张图片`));
            return false;
        }

        if (!IMAGE_CONFIG.allowedTypes.includes(file.type)) {
            notification.error(t('common:editor.unsupportedImageFormat', '仅支持 JPG、PNG、WebP、GIF 格式的图片'));
            return false;
        }

        if (file.size > IMAGE_CONFIG.maxSize) {
            notification.error(t('common:editor.imageTooLarge', '图片大小不能超过5MB'));
            return false;
        }

        try {
            if (onImageUpload) {
                const urlData = await onImageUpload(file);

                if (urlData && urlData.signedUrl) {
                    // 上传成功，使用签名URL进行即时显示
                    // 同时将稳定的、无签名的URL存储在data-stable-src属性中
                    editor.chain().focus().setImage({
                        src: urlData.signedUrl,
                        'data-stable-src': urlData.stableUrl
                    }).run();

                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error(`${source}图片上传失败:`, error);
            notification.error(t('common:editor.uploadFailed', '图片上传失败，请重试'));
            return false;
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (file) {
            await handleImageUpload(file, '本地');
        }
        event.target.value = '';
    };

    const insertDreamSeparator = () => {
        editor.chain().focus().insertDreamSeparator().run();
    };

    const insertCanvas = () => {
        setShowCanvasModal(true);
    };

    const handleCanvasComplete = async (imageData) => {
        if (imageData) {
            const response = await fetch(imageData);
            const blob = await response.blob();
            const file = new File([blob], 'canvas-drawing.png', { type: 'image/png' });
            await handleImageUpload(file, '画板');
        }
        setShowCanvasModal(false);
    };

    const headingOptions = [
        { level: 1, label: t('common:editor.heading1', '一级标题') },
        { level: 2, label: t('common:editor.heading2', '二级标题') },
        { level: 3, label: t('common:editor.heading3', '三级标题') },
    ];

    useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => document.removeEventListener('keydown', handleEscKey);
    }, [onClose]);

    return createPortal(
        <div className="tiptap-fullscreen-overlay">
            <div className="tiptap-fullscreen-container">
                {/* 全屏工具栏 */}
                <div className="tiptap-fullscreen-menubar">
                    <div className="tiptap-fullscreen-toolbar">
                        {/* 基础格式化工具 */}
                        <div className="tiptap-button-group">
                            <SimpleTooltip content={t('common:editor.bold', '加粗')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    className={cn('tiptap-menu-button', editor.isActive('bold') && 'tiptap-active')}
                                >
                                    <Bold className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>

                            <SimpleTooltip content={t('common:editor.italic', '斜体')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    className={cn('tiptap-menu-button', editor.isActive('italic') && 'tiptap-active')}
                                >
                                    <Italic className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>

                            <SimpleTooltip content={t('common:editor.strike', '删除线')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    className={cn('tiptap-menu-button', editor.isActive('strike') && 'tiptap-active')}
                                >
                                    <Strikethrough className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>
                        </div>

                        <div className="tiptap-separator" />

                        {/* 标题级别按钮组 */}
                        <div className="tiptap-button-group">
                            {headingOptions.map(({ level, label }) => (
                                <SimpleTooltip key={level} content={label}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                                        className={cn(
                                            'tiptap-menu-button tiptap-heading-button',
                                            editor.isActive('heading', { level }) && 'tiptap-active'
                                        )}
                                    >
                                        {label}
                                    </Button>
                                </SimpleTooltip>
                            ))}
                        </div>

                        <div className="tiptap-separator" />

                        {/* 列表 */}
                        <div className="tiptap-button-group">
                            <SimpleTooltip content={t('common:editor.bulletList', '项目符号列表')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                                    className={cn('tiptap-menu-button', editor.isActive('bulletList') && 'tiptap-active')}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>

                            <SimpleTooltip content={t('common:editor.orderedList', '编号列表')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                    className={cn('tiptap-menu-button', editor.isActive('orderedList') && 'tiptap-active')}
                                >
                                    <ListOrdered className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>
                        </div>

                        <div className="tiptap-separator" />

                        {/* 图片和媒体 */}
                        <div className="tiptap-button-group">
                            <SimpleTooltip content={t('common:editor.uploadImage', '上传图片')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="tiptap-menu-button"
                                    disabled={imageCount >= IMAGE_CONFIG.maxCount}
                                >
                                    <Upload className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>

                            <SimpleTooltip content={t('common:editor.insertCanvas', '插入画板')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={insertCanvas}
                                    className="tiptap-menu-button"
                                    disabled={imageCount >= IMAGE_CONFIG.maxCount}
                                >
                                    <Paintbrush className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>
                        </div>

                        <div className="tiptap-separator" />

                        {/* 梦境专用功能 */}
                        <div className="tiptap-button-group">
                            <SimpleTooltip content={t('common:editor.insertDreamSeparator', '插入梦境分隔符')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={insertDreamSeparator}
                                    className="tiptap-menu-button"
                                >
                                    <Minus className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>

                            <SimpleTooltip content={t('common:editor.insertHorizontalRule', '插入水平分割线')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                                    className="tiptap-menu-button"
                                >
                                    <GripVertical className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>
                        </div>

                        <div className="tiptap-separator" />

                        {/* 撤销重做 */}
                        <div className="tiptap-button-group">
                            <SimpleTooltip content={t('common:editor.undo', '撤销')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor.chain().focus().undo().run()}
                                    disabled={!editor.can().undo()}
                                    className="tiptap-menu-button"
                                >
                                    <Undo className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>

                            <SimpleTooltip content={t('common:editor.redo', '重做')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor.chain().focus().redo().run()}
                                    disabled={!editor.can().redo()}
                                    className="tiptap-menu-button"
                                >
                                    <Redo className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>
                        </div>

                        {/* 右侧：统计和关闭按钮 */}
                        <div className="tiptap-fullscreen-right">
                            <div className="tiptap-stats">
                                <span className="tiptap-stat-item">
                                    <Type className="w-3 h-3" />
                                    {characterCount}/{TEXT_CONFIG.maxLength}
                                </span>
                                <span className="tiptap-stat-item">
                                    📷 {imageCount}/{IMAGE_CONFIG.maxCount}
                                </span>
                            </div>

                            <SimpleTooltip content={t('common:editor.exitFullscreen', '退出全屏 (ESC)')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClose}
                                    className="tiptap-menu-button tiptap-close-button"
                                >
                                    <Minimize className="w-4 h-4" />
                                </Button>
                            </SimpleTooltip>
                        </div>
                    </div>
                </div>

                {/* 全屏编辑器内容 */}
                <div className="tiptap-fullscreen-content">
                    {children}
                </div>

                {/* 隐藏的文件输入 */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_CONFIG.allowedTypes.join(',')}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {/* 画布模态框 */}
                {showCanvasModal && (
                    <MiniCanvas
                        onComplete={handleCanvasComplete}
                        onCancel={() => setShowCanvasModal(false)}
                    />
                )}
            </div>
        </div>,
        document.body
    );
};

// 普通模式的工具栏
const NormalMenuBar = ({ editor, onImageUpload, onToggleFullscreen, characterCount, imageCount }) => {
    const { t } = useI18nContext();
    const [showCanvasModal, setShowCanvasModal] = useState(false);
    const fileInputRef = useRef(null);

    // 确保 hooks 调用顺序一致
    if (!editor) {
        return null;
    }

    // 统一图片上传处理
    const handleImageUpload = async (file, source = 'upload') => {
        if (imageCount >= IMAGE_CONFIG.maxCount) {
            notification.warning(t('common:editor.maxImagesReached', `最多只能插入${IMAGE_CONFIG.maxCount}张图片`));
            return false;
        }

        if (!IMAGE_CONFIG.allowedTypes.includes(file.type)) {
            notification.error(t('common:editor.unsupportedImageFormat', '仅支持 JPG、PNG、WebP、GIF 格式的图片'));
            return false;
        }

        if (file.size > IMAGE_CONFIG.maxSize) {
            notification.error(t('common:editor.imageTooLarge', '图片大小不能超过5MB'));
            return false;
        }

        try {
            if (onImageUpload) {
                const urlData = await onImageUpload(file);

                if (urlData && urlData.signedUrl) {
                    // 上传成功，使用签名URL进行即时显示
                    // 同时将稳定的、无签名的URL存储在data-stable-src属性中
                    editor.chain().focus().setImage({
                        src: urlData.signedUrl,
                        'data-stable-src': urlData.stableUrl
                    }).run();

                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error(`${source}图片上传失败:`, error);
            notification.error(t('common:editor.uploadFailed', '图片上传失败，请重试'));
            return false;
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (file) {
            await handleImageUpload(file, '本地');
        }
        event.target.value = '';
    };

    const insertDreamSeparator = () => {
        editor.chain().focus().insertDreamSeparator().run();
    };

    const insertCanvas = () => {
        setShowCanvasModal(true);
    };

    const handleCanvasComplete = async (imageData) => {
        if (imageData) {
            const response = await fetch(imageData);
            const blob = await response.blob();
            const file = new File([blob], 'canvas-drawing.png', { type: 'image/png' });
            await handleImageUpload(file, '画板');
        }
        setShowCanvasModal(false);
    };

    const headingOptions = [
        { level: 1, label: t('common:editor.heading1', '一级标题') },
        { level: 2, label: t('common:editor.heading2', '二级标题') },
        { level: 3, label: t('common:editor.heading3', '三级标题') },
    ];

    return (
        <>
            <div className="tiptap-menubar">
                {/* 基础格式化工具 */}
                <div className="tiptap-button-group">
                    <SimpleTooltip content={t('common:editor.bold', '加粗')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={cn('tiptap-menu-button', editor.isActive('bold') && 'tiptap-active')}
                        >
                            <Bold className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>

                    <SimpleTooltip content={t('common:editor.italic', '斜体')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={cn('tiptap-menu-button', editor.isActive('italic') && 'tiptap-active')}
                        >
                            <Italic className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>

                    <SimpleTooltip content={t('common:editor.strike', '删除线')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={cn('tiptap-menu-button', editor.isActive('strike') && 'tiptap-active')}
                        >
                            <Strikethrough className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>
                </div>

                <div className="tiptap-separator" />

                {/* 标题级别按钮组 */}
                <div className="tiptap-button-group">
                    {headingOptions.map(({ level, label }) => (
                        <SimpleTooltip key={level} content={label}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                                className={cn(
                                    'tiptap-menu-button tiptap-heading-button',
                                    editor.isActive('heading', { level }) && 'tiptap-active'
                                )}
                            >
                                {label}
                            </Button>
                        </SimpleTooltip>
                    ))}
                </div>

                <div className="tiptap-separator" />

                {/* 列表 */}
                <div className="tiptap-button-group">
                    <SimpleTooltip content={t('common:editor.bulletList', '项目符号列表')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className={cn('tiptap-menu-button', editor.isActive('bulletList') && 'tiptap-active')}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>

                    <SimpleTooltip content={t('common:editor.orderedList', '编号列表')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            className={cn('tiptap-menu-button', editor.isActive('orderedList') && 'tiptap-active')}
                        >
                            <ListOrdered className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>
                </div>

                <div className="tiptap-separator" />

                {/* 图片和媒体 */}
                <div className="tiptap-button-group">
                    <SimpleTooltip content={t('common:editor.uploadImage', '上传图片')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="tiptap-menu-button"
                            disabled={imageCount >= IMAGE_CONFIG.maxCount}
                        >
                            <Upload className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>

                    <SimpleTooltip content={t('common:editor.insertCanvas', '插入画板')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={insertCanvas}
                            className="tiptap-menu-button"
                            disabled={imageCount >= IMAGE_CONFIG.maxCount}
                        >
                            <Paintbrush className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>
                </div>

                <div className="tiptap-separator" />

                {/* 梦境专用功能 */}
                <div className="tiptap-button-group">
                    <SimpleTooltip content={t('common:editor.insertDreamSeparator', '插入梦境分隔符')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={insertDreamSeparator}
                            className="tiptap-menu-button"
                        >
                            <Minus className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>

                    <SimpleTooltip content={t('common:editor.insertHorizontalRule', '插入水平分割线')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().setHorizontalRule().run()}
                            className="tiptap-menu-button"
                        >
                            <GripVertical className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>
                </div>

                <div className="tiptap-separator" />

                {/* 撤销重做 */}
                <div className="tiptap-button-group">
                    <SimpleTooltip content={t('common:editor.undo', '撤销')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().undo().run()}
                            disabled={!editor.can().undo()}
                            className="tiptap-menu-button"
                        >
                            <Undo className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>

                    <SimpleTooltip content={t('common:editor.redo', '重做')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().redo().run()}
                            disabled={!editor.can().redo()}
                            className="tiptap-menu-button"
                        >
                            <Redo className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>
                </div>

                <div className="tiptap-separator" />

                {/* 全屏 */}
                <div className="tiptap-button-group">
                    <SimpleTooltip content={t('common:editor.fullscreen', '全屏编辑')}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggleFullscreen}
                            className="tiptap-menu-button"
                        >
                            <Maximize className="w-4 h-4" />
                        </Button>
                    </SimpleTooltip>
                </div>

                {/* 字数和图片统计 */}
                <div className="tiptap-stats">
                    <span className="tiptap-stat-item">
                        <Type className="w-3 h-3" />
                        {characterCount}/{TEXT_CONFIG.maxLength}
                    </span>
                    <span className="tiptap-stat-item">
                        📷 {imageCount}/{IMAGE_CONFIG.maxCount}
                    </span>
                </div>
            </div>

            {/* 隐藏的文件输入 */}
            <input
                ref={fileInputRef}
                type="file"
                accept={IMAGE_CONFIG.allowedTypes.join(',')}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {/* 画布模态框 */}
            {showCanvasModal && (
                <MiniCanvas
                    onComplete={handleCanvasComplete}
                    onCancel={() => setShowCanvasModal(false)}
                />
            )}
        </>
    );
};

const TiptapEditor = ({
    content = '',
    onChange,
    placeholder = '开始记录你的梦境...',
    className,
    onImageUpload,
    onImageDeleted, // 新增: 图片删除回调
    editable = true,
    ...props
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [characterCount, setCharacterCount] = useState(0);
    const [imageCount, setImageCount] = useState(0);
    const [previousImages, setPreviousImages] = useState(new Set()); // 新增: 跟踪之前的图片
    const editorRef = useRef(null);

    // 将 i18n hook 移到顶部，确保始终被调用
    const { t } = useI18nContext();

    // 新增: 从HTML中提取图片URL的工具函数
    const extractImageUrls = useCallback((html) => {
        if (!html) return [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const images = doc.querySelectorAll('img');
        return Array.from(images).map(img => img.src).filter(src => src && src.trim());
    }, []);

    // 图片上传处理回调
    const handleImageDrop = useCallback((editor, files, pos) => {
        files.forEach(async (file) => {
            const menuBar = editorRef.current?.querySelector('.tiptap-menubar');
            if (menuBar) {
                const event = new CustomEvent('imageUpload', { detail: { file, source: '拖拽' } });
                menuBar.dispatchEvent(event);
            }
        });
    }, []);

    const handleImagePaste = useCallback((editor, files) => {
        files.forEach(async (file) => {
            const menuBar = editorRef.current?.querySelector('.tiptap-menubar');
            if (menuBar) {
                const event = new CustomEvent('imageUpload', { detail: { file, source: '粘贴' } });
                menuBar.dispatchEvent(event);
            }
        });
    }, []);

    // 编辑器更新处理回调
    const handleEditorUpdate = useCallback(({ editor }) => {
        const rawHtml = editor.getHTML();
        const count = editor.storage.characterCount?.characters() || 0;

        // 计算图片数量
        const imgCount = (rawHtml.match(/<img/g) || []).length;

        // 新增: 检测删除的图片
        if (onImageDeleted) {
            const currentImages = new Set(extractImageUrls(rawHtml));
            const deletedImages = Array.from(previousImages).filter(url => !currentImages.has(url));

            // 调用删除回调
            deletedImages.forEach(url => {
                console.log('检测到图片被删除:', url);
                onImageDeleted(url);
            });

            // 更新图片集合
            setPreviousImages(currentImages);
        }

        setCharacterCount(count);
        setImageCount(imgCount);

        // 文本长度限制
        if (count > TEXT_CONFIG.maxLength) {
            return false;
        }

        // 在将HTML内容传递给父组件前，将临时的签名URL替换为稳定的URL
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;
        const images = tempDiv.querySelectorAll('img[data-stable-src]');
        images.forEach(img => {
            const stableSrc = img.getAttribute('data-stable-src');
            if (stableSrc) {
                img.setAttribute('src', stableSrc);
                img.removeAttribute('data-stable-src'); // 清理自定义属性
            }
        });
        const sanitizedHtml = tempDiv.innerHTML;

        onChange?.(sanitizedHtml);
    }, [onImageDeleted, extractImageUrls, previousImages, onChange]);

    // 编辑器创建处理回调
    const handleEditorCreate = useCallback(({ editor }) => {
        // 编辑器创建时确保状态正确
        editor.setEditable(editable !== false);
    }, [editable]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: { keepMarks: true, keepAttributes: false },
                orderedList: { keepMarks: true, keepAttributes: false },
                link: false,
                horizontalRule: false,
                heading: {
                    levels: [1, 2, 3, 4, 5, 6],
                },
            }),
            // 2. 使用 ImageResize 替换原生的 Image 扩展
            ImageResize.configure({
                HTMLAttributes: {
                    class: 'tiptap-image-resizable',
                },
                inline: false,
                allowBase64: true,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'tiptap-link' }
            }),
            Placeholder.configure({ placeholder }),
            TextStyle,
            Color,
            HorizontalRule.configure({
                HTMLAttributes: { class: 'dream-horizontal-rule' }
            }),
            CharacterCount.configure({
                mode: 'textSize',
                limit: TEXT_CONFIG.maxLength,
            }),
            FileHandler.configure({
                allowedMimeTypes: IMAGE_CONFIG.allowedTypes,
                onDrop: handleImageDrop,
                onPaste: handleImagePaste,
            }),
            DreamSeparator,
        ],
        content,
        editable,
        immediatelyRender: false, // 改为false，避免渲染冲突
        shouldRerenderOnTransaction: false,
        onCreate: handleEditorCreate,
        onUpdate: handleEditorUpdate,
        editorProps: {
            attributes: {
                class: 'tiptap-content',
                spellcheck: 'false',
            }
        },
    });

    // 全屏模式切换 - 简化逻辑，避免内容丢失
    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);

    // 同步外部content props到编辑器
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content, false);
        }
    }, [content, editor]);

    // 新增: 初始化图片列表，确保删除检测能正常工作
    useEffect(() => {
        if (editor && content) {
            const initialImages = new Set(extractImageUrls(content));
            setPreviousImages(initialImages);
            // 初始化图片集合，供删除检测使用
        }
    }, [editor, content]); // 移除 extractImageUrls 依赖，因为它有稳定引用

    // 确保编辑器在模式切换后保持可编辑状态
    useEffect(() => {
        if (editor) {
            // 确保编辑器始终可编辑
            editor.setEditable(editable !== false);

            // 在切换模式后稍微延迟聚焦，确保DOM已更新
            const timer = setTimeout(() => {
                if (!isFullscreen) {
                    // 退出全屏时强制刷新视图
                    editor.view.updateState(editor.view.state);
                }
            }, 50);

            return () => clearTimeout(timer);
        }
    }, [isFullscreen, editor, editable]);

    // 加载状态渲染
    if (!editor) {
        return <div className="tiptap-loading">{t('common:editor.loading', '编辑器加载中...')}</div>;
    }

    return (
        <>
            {!isFullscreen && (
                <div
                    ref={editorRef}
                    className={cn('tiptap-editor-wrapper', className)}
                    {...props}
                >
                    <NormalMenuBar
                        editor={editor}
                        onImageUpload={onImageUpload}
                        onToggleFullscreen={toggleFullscreen}
                        characterCount={characterCount}
                        imageCount={imageCount}
                    />

                    <ResizableEditor
                        editor={editor}
                        isFullscreen={false}
                        className="tiptap-editor-content"
                    >
                        <EditorContent editor={editor} />
                    </ResizableEditor>
                </div>
            )}

            {/* 全屏模式 */}
            {isFullscreen && (
                <FullscreenEditor
                    editor={editor}
                    onClose={() => setIsFullscreen(false)}
                    onImageUpload={onImageUpload}
                    characterCount={characterCount}
                    imageCount={imageCount}
                >
                    <EditorContent editor={editor} />
                </FullscreenEditor>
            )}
        </>
    );
};

export default TiptapEditor; 