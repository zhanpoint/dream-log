import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Edit, Trash2, Sparkles, Moon, Hash, Clock, Bed, Sun, Star, Brain, Heart, Zap, Repeat, BookOpen, Shield, Users, Globe, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
    const [showFullContent, setShowFullContent] = useState(false);

    useEffect(() => {
        fetchDreamDetail();
    }, [id]);

    const fetchDreamDetail = async () => {
        try {
            const response = await api.get(`/dreams/${id}/`);
            setDream(response.data);
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

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDuration = (duration) => {
        if (!duration) return '';
        const parts = duration.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        if (hours > 0) {
            return `${hours}小时${minutes > 0 ? `${minutes}分钟` : ''}`;
        }
        return `${minutes}分钟`;
    };

    const renderSleepQualityStars = (quality) => {
        return Array(5).fill(0).map((_, i) => (
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
            {/* 头部导航 */}
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
                    <Sparkles className="h-6 w-6" />
                    梦境详情
                </h1>
            </div>

            <div className="dream-detail-content">
                {/* 主信息卡片 */}
                <Card className="dream-main-card">
                    <CardHeader className="dream-main-header">
                        <div className="dream-title-section">
                            <h2 className="dream-title">{dream.title}</h2>
                            <div className="dream-meta-badges">
                                <Badge variant="outline" className="meta-badge">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(dream.dream_date)}
                                </Badge>
                                <Badge variant="outline" className="meta-badge">
                                    <User className="h-3 w-3" />
                                    {dream.author?.username || '未知用户'}
                                </Badge>
                            </div>
                        </div>

                        {isAuthor && (
                            <div className="dream-actions">
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
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="dream-main-content">
                        {/* 分类和标签 */}
                        <div className="tags-section">
                            {dream.categories && dream.categories.length > 0 && (
                                <div className="category-tags">
                                    {dream.categories.map(category => {
                                        // 处理分类对象，支持 name 属性和字符串格式
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
                                                <Tag className="h-3 w-3" />
                                                {config.label}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            )}

                            {dream.tags && dream.tags.length > 0 && (
                                <div className="dream-tags">
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    {dream.tags.map(tag => (
                                        <Badge key={tag.id} variant="secondary" className="tag-badge">
                                            {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Separator className="my-4" />

                        {/* 快速指标 */}
                        <div className="metrics-grid">
                            {/* 情绪指标 */}
                            <div className="metric-card">
                                <div className="metric-header">
                                    <Heart className="h-4 w-4" />
                                    <span>情绪状态</span>
                                </div>
                                <div className="emotion-display">
                                    {dream.mood_before_sleep && (
                                        <div className="emotion-item">
                                            <span className="emotion-icon">
                                                {MOOD_CONFIG[dream.mood_before_sleep]?.icon}
                                            </span>
                                            <span className="emotion-label">睡前</span>
                                        </div>
                                    )}
                                    {dream.mood_in_dream && (
                                        <div className="emotion-item">
                                            <span className="emotion-icon">
                                                {MOOD_CONFIG[dream.mood_in_dream]?.icon}
                                            </span>
                                            <span className="emotion-label">梦中</span>
                                        </div>
                                    )}
                                    {dream.mood_after_waking && (
                                        <div className="emotion-item">
                                            <span className="emotion-icon">
                                                {MOOD_CONFIG[dream.mood_after_waking]?.icon}
                                            </span>
                                            <span className="emotion-label">醒后</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 睡眠质量 */}
                            {dream.sleep_quality && (
                                <div className="metric-card">
                                    <div className="metric-header">
                                        <Bed className="h-4 w-4" />
                                        <span>睡眠质量</span>
                                    </div>
                                    <div className="sleep-quality-display">
                                        {renderSleepQualityStars(dream.sleep_quality)}
                                        <span className="quality-text">
                                            {SLEEP_QUALITY_CONFIG[dream.sleep_quality]?.label}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 清醒度 */}
                            <div className="metric-card">
                                <div className="metric-header">
                                    <Zap className="h-4 w-4" />
                                    <span>清醒度</span>
                                </div>
                                <div className="lucidity-display">
                                    <div className="lucidity-bar">
                                        <div
                                            className="lucidity-fill"
                                            style={{ width: `${(dream.lucidity_level / 5) * 100}%` }}
                                        />
                                    </div>
                                    <span className="lucidity-value">{dream.lucidity_level}/5</span>
                                </div>
                            </div>
                        </div>

                        <Separator className="my-6" />

                        {/* 选项卡内容 */}
                        <Tabs defaultValue="content" className="dream-tabs">
                            <TabsList className="tabs-list">
                                <TabsTrigger value="content">梦境内容</TabsTrigger>
                                <TabsTrigger value="analysis">分析解读</TabsTrigger>
                                <TabsTrigger value="details">详细信息</TabsTrigger>
                            </TabsList>

                            <TabsContent value="content" className="tab-content">
                                <div className="content-section">
                                    <div className={cn(
                                        "rich-text-content",
                                        !showFullContent && dream.content && dream.content.length > 800 ? "content-preview" : ""
                                    )}>
                                        <div dangerouslySetInnerHTML={{ __html: dream.content }} />
                                    </div>

                                    {dream.content && dream.content.length > 800 && (
                                        <button
                                            onClick={() => setShowFullContent(!showFullContent)}
                                            className="show-more-btn"
                                        >
                                            {showFullContent ? (
                                                <>
                                                    收起内容 <ChevronUp className="h-4 w-4" />
                                                </>
                                            ) : (
                                                <>
                                                    展开全文 <ChevronDown className="h-4 w-4" />
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="analysis" className="tab-content">
                                <div className="analysis-section">
                                    {dream.interpretation && (
                                        <div className="interpretation-card">
                                            <div className="card-header">
                                                <Brain className="h-5 w-5" />
                                                <h3>梦境解析</h3>
                                            </div>
                                            <div className="card-content">
                                                {dream.interpretation}
                                            </div>
                                        </div>
                                    )}

                                    {dream.personal_notes && (
                                        <div className="notes-card">
                                            <div className="card-header">
                                                <BookOpen className="h-5 w-5" />
                                                <h3>个人笔记</h3>
                                            </div>
                                            <div className="card-content">
                                                {dream.personal_notes}
                                            </div>
                                        </div>
                                    )}

                                    {!dream.interpretation && !dream.personal_notes && (
                                        <div className="empty-state">
                                            <Brain className="h-12 w-12 text-muted-foreground" />
                                            <p>暂无分析内容</p>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="details" className="tab-content">
                                <div className="details-section">
                                    {/* 睡眠时间 */}
                                    {(dream.bedtime || dream.wake_time || dream.sleep_duration) && (
                                        <div className="detail-group">
                                            <h3 className="group-title">
                                                <Clock className="h-4 w-4" />
                                                睡眠时间
                                            </h3>
                                            <div className="detail-items">
                                                {dream.bedtime && (
                                                    <div className="detail-item">
                                                        <Bed className="h-4 w-4" />
                                                        <span>就寝: {dream.bedtime}</span>
                                                    </div>
                                                )}
                                                {dream.wake_time && (
                                                    <div className="detail-item">
                                                        <Sun className="h-4 w-4" />
                                                        <span>醒来: {dream.wake_time}</span>
                                                    </div>
                                                )}
                                                {dream.sleep_duration && (
                                                    <div className="detail-item">
                                                        <Clock className="h-4 w-4" />
                                                        <span>时长: {formatDuration(dream.sleep_duration)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* 重复梦境 */}
                                    {dream.is_recurring && (
                                        <div className="detail-group">
                                            <h3 className="group-title">
                                                <Repeat className="h-4 w-4" />
                                                重复梦境
                                            </h3>
                                            <div className="recurring-badge">
                                                <Repeat className="w-4 h-4" />
                                                <span>这是一个重复出现的梦境</span>
                                            </div>
                                            {dream.recurring_elements && (
                                                <div className="recurring-elements">
                                                    <h4>重复元素:</h4>
                                                    <p>{dream.recurring_elements}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 隐私设置 */}
                                    <div className="detail-group">
                                        <h3 className="group-title">
                                            <Shield className="h-4 w-4" />
                                            隐私设置
                                        </h3>
                                        <div className="privacy-display">
                                            {React.createElement(PRIVACY_CONFIG[dream.privacy]?.icon, { className: 'w-4 h-4' })}
                                            <span>{PRIVACY_CONFIG[dream.privacy]?.label}</span>
                                        </div>
                                    </div>

                                    {/* 时间戳 */}
                                    <div className="timestamps">
                                        <span>创建于 {new Date(dream.created_at).toLocaleString('zh-CN')}</span>
                                        {dream.updated_at !== dream.created_at && (
                                            <span>更新于 {new Date(dream.updated_at).toLocaleString('zh-CN')}</span>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DreamDetail; 