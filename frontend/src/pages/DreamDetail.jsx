import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Edit, Trash2, Sparkles, Moon, Hash, Clock, Bed, Sun, Star, Brain, Heart, Zap, Repeat, BookOpen, Shield, Users, Globe, ChevronDown, ChevronUp, Tag, Save, X, PenLine } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import DreamAIAnalyzer from '@/components/ui/dream-ai-analyzer';
import { useAuth } from '@/hooks/useAuth';
import notification from '@/utils/notification';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import './css/DreamDetail.css';

// 梦境分类配置
const CATEGORY_CONFIG = {
    normal: { label: '普通梦境', color: '#6366f1' },
    lucid: { label: '清醒梦', color: '#8b5cf6' },
    nightmare: { label: '噩梦', color: '#ef4444' },
    recurring: { label: '重复梦', color: '#f59e0b' },
    prophetic: { label: '预知梦', color: '#10b981' },
    healing: { label: '治愈梦', color: '#06b6d4' },
    spiritual: { label: '灵性梦境', color: '#ec4899' },
    creative: { label: '创意梦境', color: '#f97316' },
    hypnagogic: { label: '入睡幻觉', color: '#d946ef' },
    hypnopompic: { label: '醒前幻觉', color: '#84cc16' },
    sleep_paralysis: { label: '睡眠瘫痪', color: '#78716c' },
    false_awakening: { label: '假醒', color: '#fbbf24' },
    anxiety: { label: '焦虑梦', color: '#f87171' },
    joyful: { label: '快乐梦境', color: '#facc15' },
    melancholic: { label: '忧郁梦境', color: '#60a5fa' },
    adventure: { label: '冒险梦境', color: '#fb923c' },
};

// 情绪配置
const MOOD_CONFIG = {
    very_negative: { label: '非常消极', icon: '😢', color: '#ef4444' },
    negative: { label: '消极', icon: '😔', color: '#f59e0b' },
    neutral: { label: '中性', icon: '😐', color: '#6b7280' },
    positive: { label: '积极', icon: '😊', color: '#10b981' },
    very_positive: { label: '非常积极', icon: '😄', color: '#06b6d4' },
};

// 睡眠质量配置
const SLEEP_QUALITY_CONFIG = {
    1: { label: '很差', color: '#ef4444' },
    2: { label: '较差', color: '#f59e0b' },
    3: { label: '一般', color: '#6b7280' },
    4: { label: '良好', color: '#10b981' },
    5: { label: '很好', color: '#06b6d4' },
};

// 隐私设置配置
const PRIVACY_CONFIG = {
    private: { label: '私人', icon: Shield, color: '#6b7280' },
    public: { label: '公开', icon: Globe, color: '#10b981' },
    friends: { label: '好友可见', icon: Users, color: '#3b82f6' },
};

const DreamDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dream, setDream] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditingInterpretation, setIsEditingInterpretation] = useState(false);
    const [userInterpretation, setUserInterpretation] = useState('');
    const [isSavingInterpretation, setIsSavingInterpretation] = useState(false);

    // 用于滚动动画的ref
    const aiAnalysisRef = useRef(null);
    const sectionsRef = useRef([]);

    useEffect(() => {
        fetchDreamDetail();
    }, [id]);

    // 滚动动画效果
    useEffect(() => {
        if (!loading && dream) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('section-visible');
                        }
                    });
                },
                { threshold: 0.1 }
            );

            sectionsRef.current.forEach(section => {
                if (section) observer.observe(section);
            });

            return () => {
                sectionsRef.current.forEach(section => {
                    if (section) observer.unobserve(section);
                });
            };
        }
    }, [loading, dream]);

    const fetchDreamDetail = async () => {
        try {
            const response = await api.get(`/dreams/${id}/`);
            setDream(response.data);
            setUserInterpretation(response.data.user_analysis || '');
        } catch (error) {
            notification.error('获取梦境详情失败');
            navigate('/my-dreams');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/dreams/${id}/`);
            notification.success('梦境已删除');
            navigate('/my-dreams');
        } catch (error) {
            notification.error('删除失败');
            setIsDeleting(false);
        }
    };

    const handleSaveInterpretation = async () => {
        setIsSavingInterpretation(true);
        try {
            const response = await api.patch(`/dreams/${id}/`, {
                user_analysis: userInterpretation
            });
            setDream({ ...dream, user_analysis: userInterpretation });
            setIsEditingInterpretation(false);
            notification.success('解析已保存');
        } catch (error) {
            notification.error('保存失败: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSavingInterpretation(false);
        }
    };

    const handleCancelEdit = () => {
        setUserInterpretation(dream.user_analysis || '');
        setIsEditingInterpretation(false);
    };

    // 平滑滚动到AI分析区域
    const scrollToAIAnalysis = () => {
        aiAnalysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDuration = (duration) => {
        if (!duration) return '';
        const [hours, minutes] = duration.split(':').map(Number);
        return hours > 0
            ? `${hours}小时${minutes > 0 ? `${minutes}分钟` : ''}`
            : `${minutes}分钟`;
    };

    const renderSleepQualityStars = (quality) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={cn(
                    "w-4 h-4",
                    i < quality ? "text-yellow-400 fill-current" : "text-gray-400"
                )}
            />
        ));
    };

    if (loading) {
        return (
            <div className="dream-detail-container">
                <div className="dream-detail-header">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Card className="dream-detail-card">
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!dream) {
        return null;
    }

    const isAuthor = user && dream.author && user.id === dream.author.id;

    return (
        <div className="dream-detail-container">
            {/* 页面头部 */}
            <div className="dream-detail-header">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="back-button"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="dream-detail-title">
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
                                        values="#f472b6;#fbbf24;#34d399;#60a5fa;#a78bfa;#f472b6"
                                        dur="3s"
                                        repeatCount="indefinite" />
                                </stop>
                                <stop offset="40%" stopColor="#fb7185">
                                    <animate attributeName="stop-color"
                                        values="#fb7185;#fed7aa;#6ee7b7;#93c5fd;#c4b5fd;#fb7185"
                                        dur="3s"
                                        repeatCount="indefinite" />
                                </stop>
                                <stop offset="60%" stopColor="#fda4af">
                                    <animate attributeName="stop-color"
                                        values="#fda4af;#fde68a;#a7f3d0;#bfdbfe;#ddd6fe;#fda4af"
                                        dur="3s"
                                        repeatCount="indefinite" />
                                </stop>
                                <stop offset="80%" stopColor="#fdba74">
                                    <animate attributeName="stop-color"
                                        values="#fdba74;#fef3c7;#d1fae5;#dbeafe;#e9d5ff;#fdba74"
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
                        <path stroke="url(#dreamGradient)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    梦境详情
                </h1>
            </div>

            {/* 主内容容器 */}
            <div className="dream-content-wrapper">
                {/* 第一屏 - 梦境核心概览区 */}
                <section
                    className="dream-section dream-overview-section"
                    ref={el => sectionsRef.current[0] = el}
                >
                    {/* 操作按钮组 - 右上角 */}
                    <div className="overview-actions">
                        {/* AI解梦按钮 */}
                        <Button
                            variant="default"
                            size="sm"
                            onClick={scrollToAIAnalysis}
                            className="ai-analysis-btn"
                        >
                            <Brain className="h-4 w-4" />
                            探索AI解梦
                        </Button>

                        {isAuthor && (
                            <>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => navigate(`/dreams/${id}/edit`)}
                                    className="action-button"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="action-button delete-button"
                                            disabled={isDeleting}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                确定要删除这个梦境记录吗？此操作无法撤销。
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>取消</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete}>
                                                确认删除
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        )}
                    </div>

                    <div className="overview-content">
                        {/* 梦境标题 */}
                        <h2 className="dream-main-title">{dream.title}</h2>

                        {/* 梦境分类和元信息 */}
                        <div className="dream-meta-row">
                            <Badge variant="outline" className="meta-badge">
                                <Calendar className="h-3 w-3" />
                                {formatDate(dream.dream_date)}
                            </Badge>

                            {/* 隐私状态 */}
                            <Badge variant="outline" className="privacy-badge">
                                {React.createElement(PRIVACY_CONFIG[dream.privacy]?.icon, { className: 'h-3 w-3' })}
                                {PRIVACY_CONFIG[dream.privacy]?.label}
                            </Badge>
                        </div>

                        {/* 分类和标签 - 单独一行 */}
                        <div className="dream-tags-row">
                            {/* 分类标签 */}
                            {dream.categories?.map(category => {
                                const categoryName = typeof category === 'object' ? category.name : category;
                                const config = CATEGORY_CONFIG[categoryName] || { label: categoryName, color: '#6b7280' };
                                return (
                                    <Badge
                                        key={typeof category === 'object' ? category.id : category}
                                        className="category-badge"
                                        style={{
                                            backgroundColor: config.color + '20',
                                            borderColor: config.color,
                                            color: config.color
                                        }}
                                    >
                                        {config.label}
                                    </Badge>
                                );
                            })}

                            {/* 重复梦境标签 */}
                            {dream.is_recurring && (
                                <Badge
                                    className="recurring-badge"
                                    variant="secondary"
                                    title={dream.recurring_elements ? `重复元素: ${dream.recurring_elements}` : '这是一个重复出现的梦境'}
                                >
                                    <Repeat className="h-3 w-3" />
                                    重复梦境
                                    {dream.recurring_elements && (
                                        <span className="recurring-hint">(悬停查看详情)</span>
                                    )}
                                </Badge>
                            )}

                            {/* 标签 */}
                            {dream.tags?.map(tag => (
                                <Badge key={tag.id} variant="secondary" className="tag-badge">
                                    <Hash className="h-3 w-3" />
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 第二屏 - 梦境内容主体区 */}
                <section
                    className="dream-section dream-content-section"
                    ref={el => sectionsRef.current[1] = el}
                >
                    <div className="section-header">
                        <h3 className="section-title">
                            <BookOpen className="h-5 w-5" />
                            梦境内容
                        </h3>
                    </div>
                    <Card className="content-card">
                        <CardContent>
                            <div
                                className="rich-text-content"
                                dangerouslySetInnerHTML={{ __html: dream.content }}
                            />
                        </CardContent>
                    </Card>
                </section>

                {/* 第三屏 - 情感体验数据区 */}
                <section
                    className="dream-section dream-emotion-section"
                    ref={el => sectionsRef.current[2] = el}
                >
                    <div className="section-header">
                        <h3 className="section-title">
                            <Heart className="h-5 w-5" />
                            睡眠与情绪
                        </h3>
                    </div>

                    <Card className="emotion-compact-card">
                        <CardContent className="emotion-compact-content">
                            {/* 情绪轨迹 - 横向紧凑布局 */}
                            {(dream.mood_before_sleep || dream.mood_in_dream || dream.mood_after_waking) && (
                                <div className="emotion-track">
                                    <h4 className="track-title">
                                        <Sparkles className="h-4 w-4" />
                                        情绪轨迹
                                    </h4>
                                    <div className="emotion-stages">
                                        {dream.mood_before_sleep && (
                                            <div className="emotion-stage">
                                                <Moon className="h-5 w-5" />
                                                <span className="stage-label">睡前</span>
                                                <span className="mood-icon-large">{MOOD_CONFIG[dream.mood_before_sleep]?.icon}</span>
                                                <span className="mood-text">{MOOD_CONFIG[dream.mood_before_sleep]?.label}</span>
                                            </div>
                                        )}
                                        {dream.mood_in_dream && (
                                            <div className="emotion-stage">
                                                <Sparkles className="h-5 w-5" />
                                                <span className="stage-label">梦中</span>
                                                <span className="mood-icon-large">{MOOD_CONFIG[dream.mood_in_dream]?.icon}</span>
                                                <span className="mood-text">{MOOD_CONFIG[dream.mood_in_dream]?.label}</span>
                                            </div>
                                        )}
                                        {dream.mood_after_waking && (
                                            <div className="emotion-stage">
                                                <Sun className="h-5 w-5" />
                                                <span className="stage-label">醒后</span>
                                                <span className="mood-icon-large">{MOOD_CONFIG[dream.mood_after_waking]?.icon}</span>
                                                <span className="mood-text">{MOOD_CONFIG[dream.mood_after_waking]?.label}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 睡眠相关指标 - 第一行 */}
                            <div className="sleep-metrics-row">
                                <h4 className="metrics-category-title">
                                    <Bed className="h-4 w-4" />
                                    睡眠状态
                                </h4>
                                <div className="metrics-row-content">
                                    {dream.sleep_quality && (
                                        <div className="metric-item compact">
                                            <div className="metric-header">
                                                <span>睡眠质量</span>
                                            </div>
                                            <div className="metric-value">
                                                <div className="stars-compact">
                                                    {renderSleepQualityStars(dream.sleep_quality)}
                                                </div>
                                                <span className="quality-text">{SLEEP_QUALITY_CONFIG[dream.sleep_quality]?.label}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 睡眠时间信息 */}
                                    {(dream.bedtime || dream.wake_time) && (
                                        <div className="metric-item compact sleep-times-item">
                                            <div className="metric-header">
                                                <span>睡眠时间</span>
                                            </div>
                                            <div className="metric-value">
                                                <div className="sleep-times-inline">
                                                    {dream.bedtime && (
                                                        <span className="time-inline">
                                                            <Bed className="h-3 w-3" />
                                                            {dream.bedtime}
                                                        </span>
                                                    )}
                                                    {dream.wake_time && (
                                                        <span className="time-inline">
                                                            <Sun className="h-3 w-3" />
                                                            {dream.wake_time}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 睡眠时长 */}
                                    {dream.sleep_duration && (
                                        <div className="metric-item compact sleep-duration-item">
                                            <div className="metric-header">
                                                <span>睡眠时长</span>
                                            </div>
                                            <div className="metric-value">
                                                <span className="duration-value-compact">{formatDuration(dream.sleep_duration)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 情绪和感知相关指标 - 第二行 */}
                            <div className="emotion-metrics-row">
                                <h4 className="metrics-category-title">
                                    <Heart className="h-4 w-4" />
                                    感知体验
                                </h4>
                                <div className="metrics-row-content">
                                    <div className="metric-item compact">
                                        <div className="metric-header">
                                            <span>清醒度</span>
                                        </div>
                                        <div className="metric-value">
                                            <div className="lucidity-compact">
                                                <div className="lucidity-bar-mini">
                                                    <div
                                                        className="lucidity-fill-mini"
                                                        style={{ width: `${(dream.lucidity_level / 5) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="lucidity-score">{dream.lucidity_level}/5</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 清晰度展示 */}
                                    {dream.vividness && (
                                        <div className="metric-item compact">
                                            <div className="metric-header">
                                                <span>清晰度</span>
                                            </div>
                                            <div className="metric-value">
                                                <div className="clarity-compact">
                                                    <div className="clarity-bar-mini">
                                                        <div
                                                            className="clarity-fill-mini"
                                                            style={{ width: `${(dream.vividness / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="clarity-score">{dream.vividness}/5</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* 第四屏 - 个人笔记区 */}
                {dream.personal_notes && (
                    <section
                        className="dream-section dream-thoughts-section"
                        ref={el => sectionsRef.current[3] = el}
                    >
                        <div className="section-header">
                            <h3 className="section-title">
                                <BookOpen className="h-5 w-5" />
                                个人笔记
                            </h3>
                        </div>

                        <Card className="notes-card">
                            <CardContent>
                                <p className="notes-content">{dream.personal_notes}</p>
                            </CardContent>
                        </Card>
                    </section>
                )}

                {/* 第五屏 - AI智能解读区 */}
                <section
                    className="dream-section dream-ai-section"
                    ref={(el) => {
                        sectionsRef.current[4] = el;
                        aiAnalysisRef.current = el;
                    }}
                >
                    <div className="section-header">
                        <h3 className="section-title">
                            <Brain className="h-5 w-5" />
                            AI智能解读
                        </h3>
                    </div>

                    <Card className="ai-analysis-card">
                        <CardContent>
                            <DreamAIAnalyzer
                                dream={dream}
                                onAnalysisComplete={(analysis) => {
                                    if (analysis) {
                                        setDream(prevDream => ({
                                            ...prevDream,
                                            ai_analysis: JSON.stringify(analysis)
                                        }));
                                    }
                                }}
                            />
                        </CardContent>
                    </Card>

                    {/* 我的解析 - 移动到AI分析结果下方 */}
                    <Card className="interpretation-card">
                        <CardHeader>
                            <div className="card-header-content">
                                <h3 className="card-title">
                                    <PenLine className="h-5 w-5" />
                                    我的解析
                                </h3>
                                {isAuthor && !isEditingInterpretation && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditingInterpretation(true)}
                                    >
                                        <Edit className="h-4 w-4 mr-1" />
                                        {userInterpretation ? '编辑' : '添加解析'}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isEditingInterpretation ? (
                                <div className="interpretation-editor">
                                    <Textarea
                                        value={userInterpretation}
                                        onChange={(e) => setUserInterpretation(e.target.value)}
                                        placeholder="参考上AI分析结果，结合你的生活经历，写下你对这个梦境的理解和感悟..."
                                        className="interpretation-textarea"
                                        rows={6}
                                    />
                                    <div className="editor-actions">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCancelEdit}
                                            disabled={isSavingInterpretation}
                                        >
                                            <X className="h-4 w-4 mr-1" />
                                            取消
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveInterpretation}
                                            disabled={isSavingInterpretation}
                                        >
                                            <Save className="h-4 w-4 mr-1" />
                                            {isSavingInterpretation ? '保存中...' : '保存'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="interpretation-content">
                                    {userInterpretation ? (
                                        <p>{userInterpretation}</p>
                                    ) : (
                                        isAuthor && (
                                            <div className="empty-state">
                                                <div className="empty-state-content">
                                                    <PenLine className="h-6 w-6 text-muted-foreground" />
                                                    <div className="empty-state-text">
                                                        <h4>参考上方AI梦境分析，结合你的生活经历和内心感受，记录下你对这个梦境的独特见解和感悟。</h4>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>



                {/* 底部更新时间 */}
                {dream.updated_at !== dream.created_at && (
                    <div className="content-footer">
                        <span className="update-time">
                            更新于 {new Date(dream.updated_at).toLocaleString('zh-CN')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DreamDetail; 