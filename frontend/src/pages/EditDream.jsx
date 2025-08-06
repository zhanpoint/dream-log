import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Hash, Lock, Moon, Sun, Cloud, Clock, Bed, Star, FileText, NotebookPen, BookOpen, Users, Globe, Heart, Brain, Palette, Text, X, Wand2 } from 'lucide-react';
import AiTitleGenerator from '@/components/ui/ai-title-generator';
import TiptapEditor from '@/components/ui/tiptap-editor';
import '@/components/ui/css/tiptap-editor.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EnhancedResizableTextarea } from '@/components/ui/enhanced-resizable-textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import notification from '@/utils/notification';
import api from '@/services/api';
import { uploadImage, markImagesForDeletion } from '@/services/oss';
import { useImageUndoRedo } from '@/hooks/useUndoRedo';
import { cn } from '@/lib/utils';
import './css/CreateDream.css';

// Enhanced Input with Traditional Label
const EnhancedInput = React.forwardRef(({ id, label, icon: Icon, className, required, optional, ...props }, ref) => {
    return (
        <div className="enhanced-input-wrapper">
            <Label htmlFor={id} className="enhanced-label">
                {Icon && <Icon className="w-4 h-4" />}
                {label}
                {required && <span className="required-star">*</span>}
                {optional && <span className="optional-text">(可选)</span>}
            </Label>
            <Input
                ref={ref}
                id={id}
                className={cn('enhanced-input', className)}
                {...props}
            />
        </div>
    );
});

// Enhanced Textarea with Traditional Label
const EnhancedTextarea = React.forwardRef(({ id, label, icon: Icon, className, required, optional, ...props }, ref) => {
    return (
        <div className="enhanced-input-wrapper">
            <Label htmlFor={id} className="enhanced-label">
                {Icon && <Icon className="w-4 h-4" />}
                {label}
                {required && <span className="required-star">*</span>}
                {optional && <span className="optional-text">(可选)</span>}
            </Label>
            <Textarea
                ref={ref}
                id={id}
                className={cn('enhanced-textarea', className)}
                {...props}
            />
        </div>
    );
});

// 梦境分类选项 - 完整版本
const DREAM_CATEGORIES = [
    { value: 'normal', label: '普通梦境', color: '#6366f1' },
    { value: 'lucid', label: '清醒梦', color: '#8b5cf6' },
    { value: 'nightmare', label: '噩梦', color: '#ef4444' },
    { value: 'recurring', label: '重复梦', color: '#f59e0b' },
    { value: 'prophetic', label: '预知梦', color: '#10b981' },
    { value: 'healing', label: '治愈梦', color: '#06b6d4' },
    { value: 'spiritual', label: '灵性梦境', color: '#ec4899' },
    { value: 'creative', label: '创意梦境', color: '#f97316' },
    { value: 'hypnagogic', label: '入睡幻觉', color: '#84cc16' },
    { value: 'hypnopompic', label: '醒前幻觉', color: '#22d3ee' },
    { value: 'sleep_paralysis', label: '睡眠瘫痪', color: '#a855f7' },
    { value: 'false_awakening', label: '假醒', color: '#fb7185' },
    { value: 'anxiety', label: '焦虑梦', color: '#f87171' },
    { value: 'joyful', label: '快乐梦境', color: '#34d399' },
    { value: 'melancholic', label: '忧郁梦境', color: '#64748b' },
    { value: 'adventure', label: '冒险梦境', color: '#fbbf24' },
];

// 情绪选项
const MOOD_OPTIONS = [
    { value: 'very_negative', label: '非常消极', icon: '😢' },
    { value: 'negative', label: '消极', icon: '😔' },
    { value: 'neutral', label: '中性', icon: '😐' },
    { value: 'positive', label: '积极', icon: '😊' },
    { value: 'very_positive', label: '非常积极', icon: '😄' },
];

// 睡眠质量选项
const SLEEP_QUALITY_OPTIONS = [
    { value: 1, label: '很差' },
    { value: 2, label: '较差' },
    { value: 3, label: '一般' },
    { value: 4, label: '良好' },
    { value: 5, label: '很好' },
];

// 隐私选项
const PRIVACY_OPTIONS = [
    { value: 'private', label: '私人', icon: Lock },
    { value: 'public', label: '公开', icon: Sun },
    { value: 'friends', label: '好友可见', icon: Cloud },
];

// 标签类型选项
const TAG_TYPES = [
    { value: 'emotion', label: '情感' },
    { value: 'character', label: '角色' },
    { value: 'location', label: '地点' },
    { value: 'object', label: '物体' },
    { value: 'action', label: '行为' },
    { value: 'symbol', label: '符号' },
    { value: 'color', label: '颜色' },
    { value: 'sound', label: '声音' },
    { value: 'weather', label: '天气' },
    { value: 'time', label: '时间' },
    { value: 'custom', label: '自定义' },
];



const EditDream = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 图片删除撤销重做管理
    const imageUndoRedo = useImageUndoRedo();

    // 表单数据
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        dream_date: new Date().toISOString().split('T')[0],
        categories: [],
        tags: [],
        lucidity_level: 0,
        mood_before_sleep: '',
        mood_in_dream: '',
        mood_after_waking: '',
        privacy: 'private',
        is_favorite: false,
        interpretation: '',
        personal_notes: '',
        sleep_quality: '',
        sleep_duration: '',
        bedtime: '',
        wake_time: '',
        is_recurring: false,
        recurring_elements: '',
        vividness: 3,
    });

    // 新标签输入
    const [newTag, setNewTag] = useState('');
    const [newTagType, setNewTagType] = useState('character');

    useEffect(() => {
        fetchDreamData();
    }, [id]);

    const fetchDreamData = async () => {
        try {
            const response = await api.get(`/dreams/${id}/`);
            const dream = response.data;
            setFormData({
                title: dream.title || '',
                content: dream.content || '',
                dream_date: dream.dream_date || new Date().toISOString().split('T')[0],
                categories: dream.categories ? dream.categories.map(cat => typeof cat === 'object' ? cat.name : cat) : [],
                tags: dream.tags || [],
                lucidity_level: dream.lucidity_level || 0,
                mood_before_sleep: dream.mood_before_sleep || '',
                mood_in_dream: dream.mood_in_dream || '',
                mood_after_waking: dream.mood_after_waking || '',
                privacy: dream.privacy || 'private',
                is_favorite: dream.is_favorite || false,
                interpretation: dream.interpretation || '',
                personal_notes: dream.personal_notes || '',
                sleep_quality: dream.sleep_quality ? dream.sleep_quality.toString() : '',
                sleep_duration: dream.sleep_duration || '',
                bedtime: dream.bedtime || '',
                wake_time: dream.wake_time || '',
                is_recurring: dream.is_recurring || false,
                recurring_elements: dream.recurring_elements || '',
                vividness: dream.vividness || 3,
            });
        } catch (error) {
            notification.error('获取梦境数据失败');
            navigate('/my-dreams');
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleCategory = (category) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category]
        }));
    };

    const addTag = () => {
        if (newTag.trim() && !formData.tags.some(tag => tag.name === newTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, { name: newTag.trim(), tag_type: newTagType }]
            }));
            setNewTag('');
        }
    };

    const removeTag = (tagName) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag.name !== tagName)
        }));
    };







    // 处理时长输入转换
    const handleDurationChange = (value) => {
        if (value) {
            const hours = parseFloat(value);
            const seconds = Math.round(hours * 3600);
            handleFieldChange('sleep_duration', seconds);
        } else {
            handleFieldChange('sleep_duration', '');
        }
    };

    // 获取时长的小时显示值
    const getDurationHours = () => {
        if (formData.sleep_duration) {
            return (formData.sleep_duration / 3600).toFixed(1);
        }
        return '';
    };

    // 自定义图片上传处理器
    const handleImageUpload = async (file, onProgress = null) => {
        try {
            // uploadImage 现在支持进度回调
            const result = await uploadImage(file, onProgress);
            if (result && result.url) {
                // 确保返回的是可公开访问的URL
                return result.url;
            }
            notification.error('图片上传成功，但无法获取URL');
            return null; // 返回null表示失败
        } catch (error) {
            notification.error('图片上传失败');
            console.error("Upload failed:", error);
            return null;
        }
    };

    // 新增: 处理图片删除
    const handleImageDeleted = (imageUrl) => {
        console.log('EditDream: 处理图片删除:', imageUrl);
        imageUndoRedo.addImageToDeleteList(imageUrl);
    };



    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            notification.error('请输入梦境标题');
            return;
        }
        if (!formData.content.trim()) {
            notification.error('请输入梦境内容');
            return;
        }

        setIsSubmitting(true);
        try {
            const submitData = {
                ...formData,
                categories: formData.categories,
                tags: formData.tags,
                sleep_quality: formData.sleep_quality ? parseInt(formData.sleep_quality) : null,
                vividness: parseInt(formData.vividness),
            };

            const response = await api.put(`/dreams/${id}/`, submitData);

            if (response.data) {
                // 处理待删除的图片
                if (imageUndoRedo.pendingDeletes.length > 0) {
                    try {
                        await markImagesForDeletion(imageUndoRedo.pendingDeletes);
                        console.log(`已标记 ${imageUndoRedo.pendingDeletes.length} 张图片待删除`);
                    } catch (error) {
                        console.warn('标记待删除图片时出错:', error);
                        // 不阻止梦境更新成功的流程
                    }
                }

                notification.success('梦境更新成功！');
                navigate(`/dreams/${id}`);
            }
        } catch (error) {
            notification.error('更新梦境失败: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="create-dream-container">
                <div className="create-dream-header">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Card className="create-dream-card">
                    <CardHeader>
                        <Skeleton className="h-6 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="create-dream-container">
            <div className="create-dream-header">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="back-button"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="create-dream-title">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="dreamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ec4899">
                                    <animate attributeName="stop-color"
                                        values="#ec4899;#f59e0b;#10b981;#3b82f6;#8b5cf6;#ec4899"
                                        dur="3s"
                                        repeatCount="indefinite" />
                                </stop>
                                <stop offset="20%" stopColor="#f472b6">
                                    <animate attributeName="stop-color"
                                        values="#f472b6;#fbbf24;#34d399;#60a5fa;#a855f7;#f472b6"
                                        dur="3s"
                                        repeatCount="indefinite" />
                                </stop>
                                <stop offset="40%" stopColor="#a855f7">
                                    <animate attributeName="stop-color"
                                        values="#a855f7;#ec4899;#f59e0b;#10b981;#3b82f6;#a855f7"
                                        dur="3s"
                                        repeatCount="indefinite" />
                                </stop>
                                <stop offset="60%" stopColor="#3b82f6">
                                    <animate attributeName="stop-color"
                                        values="#3b82f6;#8b5cf6;#ec4899;#f59e0b;#10b981;#3b82f6"
                                        dur="3s"
                                        repeatCount="indefinite" />
                                </stop>
                                <stop offset="80%" stopColor="#10b981">
                                    <animate attributeName="stop-color"
                                        values="#10b981;#3b82f6;#8b5cf6;#ec4899;#f59e0b;#10b981"
                                        dur="3s"
                                        repeatCount="indefinite" />
                                </stop>
                                <stop offset="100%" stopColor="#f59e0b">
                                    <animate attributeName="stop-color"
                                        values="#f59e0b;#10b981;#3b82f6;#8b5cf6;#ec4899;#f59e0b"
                                        dur="3s"
                                        repeatCount="indefinite" />
                                </stop>
                            </linearGradient>
                        </defs>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    编辑梦境
                </h1>
            </div>

            <Card className="create-dream-card">
                <CardHeader>
                    <CardTitle></CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 基础信息区域 */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <FileText className="w-5 h-5 mr-2" />
                            基础信息
                        </h3>

                        {/* 标题 */}
                        <div className="form-group">
                            <div className="enhanced-input-wrapper">
                                <Label htmlFor="title" className="enhanced-label">
                                    <Text className="w-4 h-4" />
                                    梦境标题
                                    <span className="required-star">*</span>
                                </Label>
                                <div className="relative flex items-center gap-2">
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => handleFieldChange('title', e.target.value)}
                                        className="enhanced-input transition-all duration-300 pr-32" // 增加右侧内边距，为按钮和计数器留出空间
                                        maxLength={30} // 限制标题最多30个字符
                                        placeholder="请输入5-30字的梦境标题..."
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className="text-xs text-purple-400 font-medium">
                                            {formData.title.length}/30
                                        </span>
                                        <AiTitleGenerator
                                            dreamContent={formData.content}
                                            onTitleGenerated={(title) => handleFieldChange('title', title)}
                                            className="shrink-0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 梦境日期 */}
                        <div className="form-group">
                            <div className="enhanced-input-wrapper">
                                <Label htmlFor="dream_date" className="enhanced-label">
                                    <Calendar className="w-4 h-4" />
                                    梦境日期
                                    <span className="required-star">*</span>
                                </Label>
                                <Input
                                    id="dream_date"
                                    type="date"
                                    value={formData.dream_date}
                                    onChange={(e) => handleFieldChange('dream_date', e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="enhanced-input"
                                />
                            </div>
                        </div>

                        {/* 梦境内容 */}
                        <div className="form-group">
                            <div className="enhanced-input-wrapper">
                                <Label className="enhanced-label">
                                    <BookOpen className="w-4 h-4" />
                                    梦境内容
                                    <span className="required-star">*</span>
                                </Label>

                                <TiptapEditor
                                    content={formData.content}
                                    onChange={(value) => handleFieldChange('content', value || '')}
                                    placeholder="开始记录你的梦境..."
                                    onImageUpload={handleImageUpload}
                                    onImageDeleted={handleImageDeleted}
                                />
                            </div>
                        </div>


                    </div>

                    {/* 分类和标签区域 */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <Palette className="w-5 h-5 mr-2" />
                            分类和标签
                        </h3>

                        {/* 梦境分类 */}
                        <div className="form-group">
                            <div className="enhanced-input-wrapper">
                                <Label className="enhanced-label">
                                    <Star className="w-4 h-4" />
                                    梦境分类 <span className="optional-text">(可选)</span>
                                </Label>
                                <div className="categories-grid">
                                    {DREAM_CATEGORIES.map(category => (
                                        <Badge
                                            key={category.value}
                                            variant={formData.categories.includes(category.value) ? "default" : "outline"}
                                            className="category-badge cursor-pointer"
                                            style={{
                                                backgroundColor: formData.categories.includes(category.value) ? category.color : 'transparent',
                                                borderColor: category.color,
                                                color: formData.categories.includes(category.value) ? 'white' : category.color
                                            }}
                                            onClick={() => toggleCategory(category.value)}
                                        >
                                            {category.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 标签 */}
                        <div className="form-group">
                            <div className="enhanced-input-wrapper">
                                <Label className="enhanced-label">
                                    <Hash className="w-4 h-4" />
                                    标签 <span className="optional-text">(可选)</span>
                                </Label>
                                <div className="tags-input-wrapper">
                                    <Select value={newTagType} onValueChange={setNewTagType}>
                                        <SelectTrigger className="tag-type-select enhanced-input">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TAG_TYPES.map(type => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="添加标签..."
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        className="tag-input enhanced-input"
                                    />
                                    <Button onClick={addTag} size="sm" className="tag-add-button">
                                        添加
                                    </Button>
                                </div>
                                <div className="tags-list">
                                    {formData.tags.map(tag => (
                                        <Badge
                                            key={tag.name}
                                            variant="secondary"
                                            className="tag-badge"
                                        >
                                            <span className="tag-type">{TAG_TYPES.find(t => t.value === tag.tag_type)?.label}:</span>
                                            {tag.name}
                                            <button
                                                onClick={() => removeTag(tag.name)}
                                                className="tag-remove"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 梦境特征区域 */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <Brain className="w-5 h-5 mr-2" />
                            梦境特征
                        </h3>

                        {/* 清醒度和清晰度 */}
                        <div className="form-row">
                            <div className="form-group">
                                <div className="enhanced-input-wrapper">
                                    <Label className="enhanced-label">
                                        <Moon className="w-4 h-4" />
                                        清醒度等级 <span className="optional-text">(可选)</span>: {formData.lucidity_level}
                                    </Label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="5"
                                        value={formData.lucidity_level}
                                        onChange={(e) => handleFieldChange('lucidity_level', parseInt(e.target.value))}
                                        className="lucidity-slider"
                                    />
                                    <div className="lucidity-labels">
                                        <span>完全无意识</span>
                                        <span>超清醒状态</span>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="enhanced-input-wrapper">
                                    <Label className="enhanced-label">
                                        <Sun className="w-4 h-4" />
                                        清晰度 <span className="optional-text">(可选)</span>: {formData.vividness}
                                    </Label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formData.vividness}
                                        onChange={(e) => handleFieldChange('vividness', parseInt(e.target.value))}
                                        className="vividness-slider"
                                    />
                                    <div className="vividness-labels">
                                        <span>模糊</span>
                                        <span>非常清晰</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 重复梦境 */}
                        <div className="form-group">
                            <div className="enhanced-input-wrapper">
                                <div className="checkbox-wrapper">
                                    <input
                                        type="checkbox"
                                        id="is_recurring"
                                        checked={formData.is_recurring}
                                        onChange={(e) => handleFieldChange('is_recurring', e.target.checked)}
                                        className="recurring-checkbox"
                                    />
                                    <Label htmlFor="is_recurring" className="recurring-label">这是一个重复梦境</Label>
                                </div>
                                {formData.is_recurring && (
                                    <Textarea
                                        placeholder="描述重复出现的元素..."
                                        value={formData.recurring_elements}
                                        onChange={(e) => handleFieldChange('recurring_elements', e.target.value)}
                                        className="enhanced-textarea"
                                        rows={3}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 情绪状态区域 */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <Heart className="w-5 h-5 mr-2" />
                            情绪状态
                        </h3>

                        <div className="moods-grid">
                            <div className="form-group">
                                <div className="enhanced-input-wrapper">
                                    <Label className="enhanced-label">
                                        <Moon className="w-4 h-4" />
                                        睡前情绪 <span className="optional-text">(可选)</span>
                                    </Label>
                                    <Select value={formData.mood_before_sleep} onValueChange={(value) => handleFieldChange('mood_before_sleep', value)}>
                                        <SelectTrigger className="enhanced-input">
                                            <SelectValue placeholder="选择情绪" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MOOD_OPTIONS.map(mood => (
                                                <SelectItem key={mood.value} value={mood.value}>
                                                    <span className="mood-option">
                                                        <span className="mood-icon">{mood.icon}</span>
                                                        {mood.label}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="enhanced-input-wrapper">
                                    <Label className="enhanced-label">
                                        <Brain className="w-4 h-4" />
                                        梦中情绪 <span className="optional-text">(可选)</span>
                                    </Label>
                                    <Select value={formData.mood_in_dream} onValueChange={(value) => handleFieldChange('mood_in_dream', value)}>
                                        <SelectTrigger className="enhanced-input">
                                            <SelectValue placeholder="选择情绪" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MOOD_OPTIONS.map(mood => (
                                                <SelectItem key={mood.value} value={mood.value}>
                                                    <span className="mood-option">
                                                        <span className="mood-icon">{mood.icon}</span>
                                                        {mood.label}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="enhanced-input-wrapper">
                                    <Label className="enhanced-label">
                                        <Sun className="w-4 h-4" />
                                        醒后情绪 <span className="optional-text">(可选)</span>
                                    </Label>
                                    <Select value={formData.mood_after_waking} onValueChange={(value) => handleFieldChange('mood_after_waking', value)}>
                                        <SelectTrigger className="enhanced-input">
                                            <SelectValue placeholder="选择情绪" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MOOD_OPTIONS.map(mood => (
                                                <SelectItem key={mood.value} value={mood.value}>
                                                    <span className="mood-option">
                                                        <span className="mood-icon">{mood.icon}</span>
                                                        {mood.label}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 睡眠信息区域 */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <Bed className="w-5 h-5 mr-2" />
                            睡眠信息
                        </h3>

                        <div className="sleep-grid">
                            <div className="form-group">
                                <div className="enhanced-input-wrapper">
                                    <Label className="enhanced-label">
                                        <Star className="w-4 h-4" />
                                        睡眠质量 <span className="optional-text">(可选)</span>
                                    </Label>
                                    <Select value={formData.sleep_quality} onValueChange={(value) => handleFieldChange('sleep_quality', value)}>
                                        <SelectTrigger className="enhanced-input">
                                            <SelectValue placeholder="选择睡眠质量" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SLEEP_QUALITY_OPTIONS.map(quality => (
                                                <SelectItem key={quality.value} value={quality.value.toString()}>
                                                    <span className="quality-option">
                                                        <Star className="h-4 w-4 mr-1" />
                                                        {quality.label}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="enhanced-input-wrapper">
                                    <Label className="enhanced-label">
                                        <Clock className="w-4 h-4" />
                                        睡眠时长 <span className="optional-text">(可选，小时)</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="24"
                                        placeholder="8.5"
                                        value={getDurationHours()}
                                        onChange={(e) => handleDurationChange(e.target.value)}
                                        className="enhanced-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="enhanced-input-wrapper">
                                    <Label className="enhanced-label">
                                        <Moon className="w-4 h-4" />
                                        就寝时间 <span className="optional-text">(可选)</span>
                                    </Label>
                                    <Input
                                        type="time"
                                        value={formData.bedtime}
                                        onChange={(e) => handleFieldChange('bedtime', e.target.value)}
                                        className="enhanced-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="enhanced-input-wrapper">
                                    <Label className="enhanced-label">
                                        <Sun className="w-4 h-4" />
                                        醒来时间 <span className="optional-text">(可选)</span>
                                    </Label>
                                    <Input
                                        type="time"
                                        value={formData.wake_time}
                                        onChange={(e) => handleFieldChange('wake_time', e.target.value)}
                                        className="enhanced-input"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 解析和笔记区域 */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <Wand2 className="w-5 h-5 mr-2" />
                            解析和笔记
                        </h3>

                        {/* 梦境解析 */}
                        <div className="form-group">
                            <EnhancedResizableTextarea
                                id="interpretation"
                                label="梦境解析"
                                icon={Brain}
                                optional
                                placeholder="记录你对这个梦境的理解和解析..."
                                value={formData.interpretation}
                                onChange={(e) => handleFieldChange('interpretation', e.target.value)}
                                minHeight={120}
                                maxHeight={400}
                                defaultHeight={120}
                            />
                        </div>

                        {/* 个人笔记 */}
                        <div className="form-group">
                            <EnhancedResizableTextarea
                                id="personal_notes"
                                label="个人笔记"
                                icon={NotebookPen}
                                optional
                                placeholder="记录你的个人想法、感受或其他备注..."
                                value={formData.personal_notes}
                                onChange={(e) => handleFieldChange('personal_notes', e.target.value)}
                                minHeight={100}
                                maxHeight={350}
                                defaultHeight={100}
                            />
                        </div>
                    </div>

                    {/* 隐私设置区域 */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <Lock className="w-5 h-5 mr-2" />
                            隐私设置
                        </h3>

                        <div className="form-group">
                            <div className="enhanced-input-wrapper">
                                <Label className="enhanced-label">
                                    <Globe className="w-4 h-4" />
                                    谁可以查看这个梦境
                                </Label>
                                <div className="privacy-options">
                                    {PRIVACY_OPTIONS.map(option => {
                                        const Icon = option.icon;
                                        return (
                                            <button
                                                key={option.value}
                                                className={`privacy-option ${formData.privacy === option.value ? 'active' : ''}`}
                                                onClick={() => handleFieldChange('privacy', option.value)}
                                            >
                                                <Icon className="h-5 w-5" />
                                                <span>{option.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 提交按钮 */}
                    <div className="form-actions">
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            disabled={isSubmitting}
                            className="cancel-button"
                        >
                            <X className="w-4 h-4 mr-2" />
                            取消
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="submit-button"
                        >
                            {isSubmitting ? '更新中...' : '更新梦境'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default EditDream; 