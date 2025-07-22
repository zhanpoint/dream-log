import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Calendar, Sparkles, Moon, Hash, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import notification from '@/utils/notification';
import api from '@/services/api';
import './css/MyDreams.css';

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
    very_negative: '😢',
    negative: '😔',
    neutral: '😐',
    positive: '😊',
    very_positive: '😄',
};

const MyDreams = () => {
    const navigate = useNavigate();
    const [dreams, setDreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        fetchDreams();
    }, []);

    const fetchDreams = async () => {
        try {
            const response = await api.get('/dreams/');
            const dreamsData = response.data.results || response.data;
            setDreams(Array.isArray(dreamsData) ? dreamsData : []);
        } catch (error) {
            notification.error('获取梦境列表失败');
            setDreams([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (dreamId) => {
        setDeletingId(dreamId);
        try {
            await api.delete(`/dreams/${dreamId}/`);
            setDreams(dreams.filter(dream => dream.id !== dreamId));
            notification.success('梦境已删除');
        } catch (error) {
            notification.error('删除失败');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const truncateContent = (content, maxLength = 150) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    // 过滤和排序梦境
    const filteredAndSortedDreams = dreams
        .filter(dream => {
            const matchesSearch = dream.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dream.content.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' ||
                dream.categories.includes(filterCategory);
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.dream_date) - new Date(a.dream_date);
                case 'oldest':
                    return new Date(a.dream_date) - new Date(b.dream_date);
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

    if (loading) {
        return (
            <div className="my-dreams-container">
                <div className="my-dreams-header">
                    <h1 className="my-dreams-title">
                        <Moon className="h-8 w-8" />
                        我的梦境
                    </h1>
                </div>
                <div className="dreams-grid">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="dream-card">
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2 mt-2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="my-dreams-container">
            <div className="my-dreams-header">
                <h1 className="my-dreams-title">
                    <Moon className="h-8 w-8" />
                    我的梦境
                </h1>
                <Button
                    onClick={() => navigate('/dreams/create')}
                    className="create-dream-button"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    记录新梦境
                </Button>
            </div>

            {/* 搜索和筛选栏 */}
            <div className="search-filter-bar">
                <div className="search-wrapper">
                    <Search className="search-icon" />
                    <Input
                        type="text"
                        placeholder="搜索梦境..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-controls">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="filter-select">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="筛选分类" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部分类</SelectItem>
                            {Object.entries(CATEGORY_CONFIG).map(([value, config]) => (
                                <SelectItem key={value} value={value}>
                                    {config.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="filter-select">
                            <SelectValue placeholder="排序方式" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">最新优先</SelectItem>
                            <SelectItem value="oldest">最早优先</SelectItem>
                            <SelectItem value="title">标题排序</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 梦境统计 */}
            <div className="dreams-stats">
                <div className="stat-item">
                    <Sparkles className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">{dreams.length}</span>
                        <span className="stat-label">总梦境数</span>
                    </div>
                </div>
                <div className="stat-item">
                    <Calendar className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-value">
                            {dreams.filter(d => {
                                const today = new Date().toDateString();
                                return new Date(d.dream_date).toDateString() === today;
                            }).length}
                        </span>
                        <span className="stat-label">今日梦境</span>
                    </div>
                </div>
            </div>

            {/* 梦境列表 */}
            {filteredAndSortedDreams.length === 0 ? (
                <div className="empty-state">
                    <Moon className="empty-icon" />
                    <h3 className="empty-title">还没有梦境记录</h3>
                    <p className="empty-description">
                        {searchTerm || filterCategory !== 'all'
                            ? '没有找到匹配的梦境'
                            : '开始记录你的第一个梦境吧'}
                    </p>
                    {!searchTerm && filterCategory === 'all' && (
                        <Button onClick={() => navigate('/dreams/create')} className="mt-4">
                            <Plus className="h-4 w-4 mr-2" />
                            记录梦境
                        </Button>
                    )}
                </div>
            ) : (
                <div className="dreams-grid">
                    {filteredAndSortedDreams.map(dream => (
                        <Card key={dream.id} className="dream-card">
                            <CardHeader className="dream-card-header">
                                <div className="dream-card-title-row">
                                    <h3 className="dream-card-title">{dream.title}</h3>
                                    <div className="dream-card-actions">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => navigate(`/dreams/${dream.id}`)}
                                            className="action-icon"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => navigate(`/dreams/${dream.id}/edit`)}
                                            className="action-icon"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="action-icon delete-icon"
                                                    disabled={deletingId === dream.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        确定要删除梦境 "{dream.title}" 吗？此操作无法撤销。
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(dream.id)}>
                                                        确认删除
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                <div className="dream-card-meta">
                                    <span className="meta-item">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(dream.dream_date)}
                                    </span>
                                    {dream.lucidity_level > 0 && (
                                        <span className="meta-item lucidity">
                                            清醒度: {dream.lucidity_level}/5
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="dream-card-content">
                                {/* 分类标签 */}
                                {dream.categories.length > 0 && (
                                    <div className="dream-categories">
                                        {dream.categories.map(category => {
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
                                    </div>
                                )}

                                {/* 梦境内容预览 */}
                                <p className="dream-preview">
                                    {truncateContent(dream.content.replace(/[#*`]/g, ''))}
                                </p>

                                {/* 标签和情绪 */}
                                <div className="dream-footer">
                                    {dream.tags.length > 0 && (
                                        <div className="dream-tags">
                                            <Hash className="h-3 w-3" />
                                            {dream.tags.slice(0, 3).map(tag => (
                                                <span key={tag.id} className="tag-name">
                                                    {tag.name}
                                                </span>
                                            ))}
                                            {dream.tags.length > 3 && (
                                                <span className="tag-more">+{dream.tags.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="dream-moods">
                                        {dream.mood_before_sleep && (
                                            <span className="mood-icon" title="睡前情绪">
                                                {MOOD_CONFIG[dream.mood_before_sleep]}
                                            </span>
                                        )}
                                        {dream.mood_in_dream && (
                                            <span className="mood-icon" title="梦中情绪">
                                                {MOOD_CONFIG[dream.mood_in_dream]}
                                            </span>
                                        )}
                                        {dream.mood_after_waking && (
                                            <span className="mood-icon" title="醒后情绪">
                                                {MOOD_CONFIG[dream.mood_after_waking]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyDreams; 