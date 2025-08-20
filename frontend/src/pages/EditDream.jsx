import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Hash, Lock, Moon, Sun, Cloud, Clock, Bed, Star, FileText, NotebookPen, BookOpen, Users, Globe, Heart, Brain, Palette, Text, X, Info } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
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
    { value: 'normal', label: '普通梦境', color: '#6366f1', description: '最常见的梦境类型，通常反映日常生活经历和潜意识活动。这类梦境内容相对平和，可能包含熟悉的人物、场景和情境，是大脑在睡眠中整理记忆和情感的正常表现。' },
    { value: 'lucid', label: '清醒梦', color: '#8b5cf6', description: '在梦中意识到自己正在做梦的特殊状态。清醒梦者可以在一定程度上控制梦境内容，这种能力可以通过练习获得。对于创意工作者和心理治疗具有重要价值。' },
    { value: 'nightmare', label: '噩梦', color: '#ef4444', description: '引起强烈恐惧、焦虑或不适感的梦境。通常包含威胁性情境，可能导致惊醒。频繁的噩梦可能与压力、创伤或心理健康问题相关，需要关注和适当处理。' },
    { value: 'recurring', label: '重复梦', color: '#f59e0b', description: '内容相似或完全相同的反复出现的梦境。这类梦境往往指向未解决的心理冲突或重要的生活主题，大脑通过重复来强调需要关注的问题。' },
    { value: 'prophetic', label: '预知梦', color: '#10b981', description: '似乎预示未来事件的梦境。虽然科学上缺乏确凿证据，但许多人报告过此类体验。可能是潜意识对现有信息的整合和推测，值得记录和观察。' },
    { value: 'healing', label: '治愈梦', color: '#06b6d4', description: '带来心理慰藉和情感修复的梦境。这类梦境通常包含积极的象征、已故亲人的安慰或问题的解决方案，有助于心理创伤的恢复和情感的平衡。' },
    { value: 'spiritual', label: '灵性梦境', color: '#ec4899', description: '涉及宗教、哲学或超越性体验的梦境。可能包含神圣符号、精神导师或深刻的洞察。这类梦境常被认为具有特殊意义，反映个人的精神追求和信仰体系。' },
    { value: 'creative', label: '创意梦境', color: '#f97316', description: '产生新颖想法、艺术灵感或问题解决方案的梦境。许多科学发现和艺术作品都源于梦境启发。大脑在睡眠中的自由联想能够突破常规思维限制。' },
    { value: 'hypnagogic', label: '入睡幻觉', color: '#84cc16', description: '在入睡过程中出现的半梦半醒状态下的感知体验。常见现象包括听到声音、看到图像或感觉身体下坠。这是意识从清醒向睡眠过渡的正常生理现象。' },
    { value: 'hypnopompic', label: '醒前幻觉', color: '#22d3ee', description: '在觉醒过程中出现的类似梦境的感知体验。可能在完全清醒前持续几秒到几分钟。这是大脑从睡眠状态向清醒状态转换时的正常现象。' },
    { value: 'sleep_paralysis', label: '睡眠瘫痪', color: '#a855f7', description: '意识清醒但身体无法移动的状态，通常伴随恐惧感和幻觉。这是REM睡眠期间肌肉麻痹机制的异常延续，虽然令人不安但通常无害。' },
    { value: 'false_awakening', label: '假醒', color: '#fb7185', description: '梦中以为自己已经醒来并开始日常活动的体验。这类梦境极其逼真，可能连续发生多次。反映了大脑对日常例行公事的深度记忆和自动化处理。' },
    { value: 'anxiety', label: '焦虑梦', color: '#f87171', description: '反映现实压力和担忧的梦境。常见主题包括考试失败、迟到、被追赶等。这类梦境是心理压力的自然表达，有助于情感的释放和处理。' },
    { value: 'joyful', label: '快乐梦境', color: '#34d399', description: '充满积极情感和愉悦体验的梦境。可能包含成功场景、团聚时刻或美好回忆。这类梦境反映内心的希望和愿望，有助于维持心理健康和乐观态度。' },
    { value: 'melancholic', label: '忧郁梦境', color: '#64748b', description: '带有悲伤、怀念或失落情绪的梦境。常涉及分离、失去或过往回忆。这类梦境帮助处理悲伤情感，是心理适应和情感整合的重要过程。' },
    { value: 'adventure', label: '冒险梦境', color: '#fbbf24', description: '充满探索、挑战和新奇体验的梦境。可能包含旅行、发现或克服困难的情节。反映对新体验的渴望和对未知的好奇心，激发生活的活力和创造力。' },
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
    { value: 'weather', label: '天气' },
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
        if (value && !isNaN(value)) {
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
                                        <span className="text-xs text-primary font-medium">
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
                                    <HoverCard>
                                        <HoverCardTrigger>
                                            <Info className="w-4 h-4 ml-1 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                                        </HoverCardTrigger>
                                        <HoverCardContent className="w-96 max-h-96 bg-popover/95 backdrop-blur-md border border-border text-popover-foreground shadow-xl">
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-semibold text-primary">梦境类别说明</h4>
                                                <p className="text-xs text-muted-foreground">选择最符合你梦境特点的类别：</p>
                                                <div className="max-h-60 overflow-y-auto pr-2">
                                                    {DREAM_CATEGORIES.map(category => (
                                                        <div key={category.value} className="mb-2 last:mb-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }}></div>
                                                                <span className="text-xs font-medium" style={{ color: category.color }}>{category.label}</span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </HoverCardContent>
                                    </HoverCard>
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
                                        <HoverCard>
                                            <HoverCardTrigger asChild>
                                                <Info className="w-4 h-4 ml-1 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-96 max-h-96 bg-popover/95 backdrop-blur-md border border-border text-popover-foreground shadow-xl">
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-semibold text-primary">清醒度等级说明</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        清醒度等级是指在梦境中对自己正在做梦这一事实的意识程度。
                                                    </p>
                                                    <div className="space-y-1 text-xs">
                                                        <div><span className="font-medium">0级 - 完全无意识：</span> 完全不知道自己在做梦，梦境体验如同现实</div>
                                                        <div><span className="font-medium">1级 - 微弱意识：</span> 偶尔怀疑现实，但很快被梦境逻辑说服</div>
                                                        <div><span className="font-medium">2级 - 模糊意识：</span> 隐约感觉不对劲，但无法确定是在做梦</div>
                                                        <div><span className="font-medium">3级 - 部分清醒：</span> 意识到在做梦，但控制能力有限</div>
                                                        <div><span className="font-medium">4级 - 高度清醒：</span> 完全知道在做梦，能够进行一定程度的控制</div>
                                                        <div><span className="font-medium">5级 - 超清醒状态：</span> 完全清醒，能够自由控制梦境内容和情节</div>
                                                    </div>
                                                </div>
                                            </HoverCardContent>
                                        </HoverCard>
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
                                        <HoverCard>
                                            <HoverCardTrigger asChild>
                                                <Info className="w-4 h-4 ml-1 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-96 max-h-96 bg-popover/95 backdrop-blur-md border border-border text-popover-foreground shadow-xl">
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-semibold text-primary">清晰度说明</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        清晰度是指梦境中感官体验的生动程度和细节丰富度。
                                                    </p>
                                                    <div className="space-y-1 text-xs">
                                                        <div><span className="font-medium">1级 - 模糊：</span> 梦境朦胧不清，细节缺失，如同雾中看花</div>
                                                        <div><span className="font-medium">2级 - 较模糊：</span> 能看清大致轮廓，但细节不够清晰</div>
                                                        <div><span className="font-medium">3级 - 一般：</span> 梦境相对清晰，能够辨认人物和场景</div>
                                                        <div><span className="font-medium">4级 - 清晰：</span> 梦境生动清晰，细节丰富，接近现实体验</div>
                                                        <div><span className="font-medium">5级 - 非常清晰：</span> 梦境极其生动，所有感官都异常清晰，甚至超越现实</div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        注意：清晰度与清醒度是两个不同的概念。清晰度关注感官体验，清醒度关注意识状态。
                                                    </p>
                                                </div>
                                            </HoverCardContent>
                                        </HoverCard>
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

                    {/* 个人笔记区域 */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <NotebookPen className="w-5 h-5 mr-2" />
                            个人笔记
                            <span className="optional-text ml-auto">(可选)</span>
                        </h3>

                        <div className="form-group">
                            <EnhancedResizableTextarea
                                id="personal_notes"
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