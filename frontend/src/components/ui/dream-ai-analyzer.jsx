/*
AI梦境分析组件
支持实时分析过程展示和结果渲染
*/
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, AlertCircle, CheckCircle, BookOpen, Lightbulb, X, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BorderBeam } from '@/components/magicui/border-beam';
import { useAuth } from '@/hooks/useAuth';
import { useI18nContext } from '@/contexts/I18nContext';
import api from '@/services/api';
import notification from '@/utils/notification';
import { cn } from '@/lib/utils';
import './css/ai-dream-analyzer.css';

// 分析状态配置 - 简化版本
const getAnalysisStatus = (t) => ({
    analyzing: { label: t('ai.analyzing', 'AI正在深度解析你的梦境...'), icon: Brain, color: '#6366f1' },
    completed: { label: t('ai.completed', '分析完成'), icon: CheckCircle, color: '#06b6d4' },
    error: { label: t('ai.error', '分析失败'), icon: AlertCircle, color: '#ef4444' }
});

const DreamAIAnalyzer = ({ dream, onAnalysisComplete }) => {
    const { user } = useAuth();
    const { t } = useI18nContext();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState('idle');
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);
    const [taskId, setTaskId] = useState(null);
    const [expandedSections, setExpandedSections] = useState(new Set());

    const wsRef = useRef(null);

    // 初始化时检查是否已有保存的AI分析结果
    useEffect(() => {
        if (dream && dream.ai_analysis) {
            try {
                const savedAnalysis = typeof dream.ai_analysis === 'string'
                    ? JSON.parse(dream.ai_analysis)
                    : dream.ai_analysis;
                setAnalysisResult(savedAnalysis);
                console.log('Loaded saved AI analysis result:', savedAnalysis);
            } catch (error) {
                console.error('Failed to parse saved AI analysis:', error);
            }
        }
    }, [dream]);

    // 组件卸载时清理WebSocket连接
    useEffect(() => {
        return () => {
            disconnectWebSocket();
        };
    }, []);

    const connectWebSocket = () => {
        // 如果已经有连接，先断开
        if (wsRef.current) {
            disconnectWebSocket();
        }

        try {
            // 获取JWT Token（使用统一的键名）
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setError('未找到认证Token，请重新登录');
                return;
            }

            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws/dream/analysis/?token=${token}`;

            console.log('建立WebSocket连接...');
            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log('WebSocket连接已建立');
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    // 忽略无效消息
                }
            };

            socket.onclose = (event) => {
                console.log('WebSocket连接已关闭', event.code);
                wsRef.current = null;
            };

            socket.onerror = () => {
                console.error('WebSocket连接错误');
                setError('无法建立实时连接，请刷新页面重试');
            };

            wsRef.current = socket;

        } catch (error) {
            setError('无法建立实时连接，请刷新页面重试');
        }
    };

    const disconnectWebSocket = () => {
        if (wsRef.current) {
            console.log('主动断开WebSocket连接');
            wsRef.current.close();
            wsRef.current = null;
        }
    };

    const handleWebSocketMessage = (data) => {
        switch (data.type) {
            case 'dream_analysis_update':
                handleAnalysisUpdate(data);
                break;
            case 'connection_established':
                // 连接成功
                break;
            case 'error':
                handleAnalysisError(data.message);
                break;
            default:
                break;
        }
    };

    const handleAnalysisUpdate = (data) => {
        setAnalysisStatus(data.status);

        if (data.status === 'completed' && data.data?.analysis_result) {
            setAnalysisResult(data.data.analysis_result);
            setIsAnalyzing(false);
            // 分析完成后断开WebSocket连接
            disconnectWebSocket();
            if (onAnalysisComplete) {
                onAnalysisComplete(data.data.analysis_result);
            }
            notification.success(t('dreams:detail.aiAnalysisCompleted', 'AI梦境分析完成！'));
        } else if (data.status === 'error') {
            handleAnalysisError(data.data?.error || t('dreams:detail.aiAnalysisError', '分析过程中出现错误'));
        }
    };

    const handleAnalysisError = (errorMessage) => {
        setError(errorMessage);
        setIsAnalyzing(false);
        setAnalysisStatus('error');
        // 分析出错时也断开WebSocket连接
        disconnectWebSocket();
        notification.error(`${t('dreams:detail.aiAnalysisFailed', '分析失败')}: ${errorMessage}`);
    };

    // 前端数据验证函数
    const validateDreamData = (dreamData) => {
        const errors = [];
        const warnings = [];

        // 必需字段检查
        if (!dreamData.content || dreamData.content.trim().length === 0) {
            errors.push('梦境内容不能为空');
        } else if (dreamData.content.trim().length < 10) {
            errors.push('梦境内容过短，需要至少10个字符');
        } else if (dreamData.content.length > 10000) {
            warnings.push('梦境内容过长，可能影响分析质量');
        }

        // 标题检查
        if (!dreamData.title || dreamData.title.trim().length === 0) {
            warnings.push('缺少梦境标题');
        }

        // 情绪字段检查
        const moodFields = ['mood_before_sleep', 'mood_in_dream', 'mood_after_waking'];
        for (const field of moodFields) {
            if (!dreamData[field]) {
                warnings.push(`缺少${field}信息，可能影响分析深度`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            contentLength: dreamData.content ? dreamData.content.length : 0,
            hasCategories: Boolean(dreamData.categories && dreamData.categories.length > 0),
            hasTags: Boolean(dreamData.tags && dreamData.tags.length > 0)
        };
    };

    // 准备分析所需的数据（只包含AI分析需要的字段）
    const prepareDreamDataForAnalysis = (dream) => {
        return {
            id: dream.id,
            title: dream.title || '未命名梦境',
            content: dream.content || '',
            categories: dream.categories || [],
            tags: dream.tags || [],
            lucidity_level: dream.lucidity_level || 1,
            vividness: dream.vividness || 3,
            mood_before_sleep: dream.mood_before_sleep || 'unknown',
            mood_in_dream: dream.mood_in_dream || 'unknown',
            mood_after_waking: dream.mood_after_waking || 'unknown',
            sleep_quality: dream.sleep_quality || 3,
            personal_notes: dream.personal_notes || '',
            // 显示名称字段（如果有的话）
            mood_before_sleep_display: dream.mood_before_sleep_display || '未知',
            mood_in_dream_display: dream.mood_in_dream_display || '未知',
            mood_after_waking_display: dream.mood_after_waking_display || '未知',
            lucidity_level_display: dream.lucidity_level_display || `${dream.lucidity_level || 1}/5`,
            sleep_quality_display: dream.sleep_quality_display || `${dream.sleep_quality || 3}/5`,
        };
    };

    const startAnalysis = async () => {
        try {
            // 前端数据验证
            const dreamData = prepareDreamDataForAnalysis(dream);
            const validation = validateDreamData(dreamData);

            if (!validation.isValid) {
                const errorMessage = validation.errors.join('；');
                setError(errorMessage);
                notification.error(`无法进行梦境分析：${errorMessage}`);
                return;
            }

            // 显示警告信息（如果有）
            if (validation.warnings.length > 0) {
                notification.warning(`提示：${validation.warnings.join('；')}`);
            }

            // 在开始分析时建立WebSocket连接
            connectWebSocket();

            setIsAnalyzing(true);
            setAnalysisStatus('analyzing');
            setError(null);

            // 发送分析请求 (不再需要websocket_channel_id)
            const response = await api.post('/ai/dream-analysis/start/', {
                dream_data: dreamData
            });

            if (response.data.success) {
                setTaskId(response.data.task_id);
            } else {
                throw new Error(response.data.error || t('dreams:detail.aiAnalysisStartFailed', '启动分析失败'));
            }

        } catch (error) {
            handleAnalysisError(error.message || t('dreams:detail.aiAnalysisStartFailed', '启动分析失败'));
        }
    };

    const cancelAnalysis = async () => {
        try {
            if (taskId) {
                await api.post(`/ai/dream-analysis/cancel/${taskId}/`);
            }
            notification.info(t('dreams:detail.aiAnalysisCancelled', '已取消分析'));
        } catch (error) {
            notification.error(t('dreams:detail.aiAnalysisCancelFailed', '取消分析失败'));
        } finally {
            // 确保无论成功或失败，都重置UI状态并断开连接
            disconnectWebSocket();
            setIsAnalyzing(false);
            setAnalysisStatus('idle');
            setTaskId(null);
        }
    };

    const toggleSection = (sectionId) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    // 渲染核心洞察卡片（始终展开）
    const renderAnalysisSummary = (summary) => {
        return (
            <Card className="analysis-summary-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        {summary.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* 一句话洞察 - 突出显示 */}
                    <div className="one-sentence-insight">
                        <p className="insight-text">{summary.one_sentence_insight}</p>
                    </div>

                    {/* 关键洞察列表 */}
                    <div className="key-insights">
                        <h4>{t('ai.keyFindings', '关键发现')}</h4>
                        <ul className="insights-list">
                            {summary.key_insights.map((insight, index) => (
                                <li key={index} className="insight-item">
                                    <Lightbulb className="h-4 w-4" />
                                    <span>{insight}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 情绪核心 */}
                    <div className="emotional-core">
                        <h4>{t('ai.emotionalInsights', '情绪洞察')}</h4>
                        <p>{summary.emotional_core}</p>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // 渲染可折叠的分析板块
    const renderCollapsibleSection = (section, icon, content) => {
        const isExpanded = expandedSections.has(section.title);

        return (
            <div className="collapsible-section">
                <button
                    className="section-header"
                    onClick={() => toggleSection(section.title)}
                >
                    <div className="header-content">
                        {React.createElement(icon, { className: "h-5 w-5" })}
                        <h3>{section.title}</h3>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 toggle-icon" />
                    ) : (
                        <ChevronDown className="h-5 w-5 toggle-icon" />
                    )}
                </button>

                {isExpanded && (
                    <div className="section-content">
                        {content}
                    </div>
                )}
            </div>
        );
    };

    // 渲染梦境故事线
    const renderDreamNarrative = (narrative) => (
        <div className="dream-narrative-content">
            <div className="story-arc">
                <h4>{t('ai.storyArc', '故事脉络')}</h4>
                <p>{narrative.story_arc}</p>
            </div>

            <div className="turning-points">
                <h4>{t('ai.keyTurningPoints', '关键转折')}</h4>
                <ul>
                    {narrative.turning_points.map((point, index) => (
                        <li key={index}>{point}</li>
                    ))}
                </ul>
            </div>

            <div className="hidden-message">
                <h4>{t('ai.hiddenMessage', '潜在信息')}</h4>
                <p>{narrative.hidden_message}</p>
            </div>
        </div>
    );

    // 渲染核心象征
    const renderSymbolDeepDive = (symbols) => (
        <div className="symbol-deep-dive-content">
            <div className="main-symbols">
                <h4>{t('ai.coreSymbols', '核心象征')}</h4>
                {symbols.main_symbols.map((symbol, index) => (
                    <div key={index} className="symbol-item">
                        <h5>{symbol.symbol}</h5>
                        <p><strong>{t('ai.personalMeaning', '个人意义：')}</strong>{symbol.personal_meaning}</p>
                        <p><strong>{t('ai.lifeConnection', '生活联系：')}</strong>{symbol.life_connection}</p>
                    </div>
                ))}
            </div>

            <div className="symbol-pattern">
                <h4>{t('ai.symbolConnections', '象征关联')}</h4>
                <p>{symbols.symbol_pattern}</p>
            </div>
        </div>
    );

    // 渲染成长启示
    const renderGrowthGuidance = (guidance) => (
        <div className="growth-guidance-content">
            <div className="self-discovery">
                <h4>{t('ai.selfDiscovery', '自我发现')}</h4>
                <p>{guidance.self_discovery}</p>
            </div>

            <div className="practical-actions">
                <h4>{t('ai.practicalAdvice', '实践建议')}</h4>
                <ul>
                    {guidance.practical_actions.map((action, index) => (
                        <li key={index}>{action}</li>
                    ))}
                </ul>
            </div>

            <div className="reflection-questions">
                <h4>深思问题</h4>
                <ul>
                    {guidance.reflection_questions.map((question, index) => (
                        <li key={index}>{question}</li>
                    ))}
                </ul>
            </div>

            <div className="encouraging-message">
                <p className="encouragement">{guidance.encouraging_message}</p>
            </div>
        </div>
    );

    return (
        <div className="dream-ai-analyzer">
            {/* 分析触发按钮 - 只在没有分析结果且没有正在分析时显示 */}
            {!isAnalyzing && !analysisResult && (
                <div className="analyzer-trigger">
                    <Button
                        onClick={startAnalysis}
                        className="ai-analyze-button"
                        size="lg"
                        disabled={!dream?.content}
                    >
                        <Brain className="h-5 w-5" />
                        {t('dreams:detail.aiAnalysisButton', 'AI解梦分析')}
                        <Sparkles className="h-4 w-4" />
                    </Button>
                    <p className="analyzer-description">
                        {t('dreams:detail.aiAnalysisDescriptionText', '使用先进的AI技术，结合心理学理论对你的梦境进行深度分析')}
                    </p>
                </div>
            )}

            {/* AI分析进行中 - 梦幻版本 */}
            {isAnalyzing && (
                <Card className="analysis-progress-card relative overflow-hidden">
                    {/* 梦幻渐变背景 */}
                    <div
                        className="absolute inset-0 opacity-20 dark:opacity-30"
                        style={{
                            background: 'linear-gradient(135deg, #1e293b 0%, #581c87 35%, #9f1239 70%, #ec4899 100%)',
                        }}
                    ></div>

                    <CardContent className="progress-container relative z-10">
                        <div className="progress-visual flex items-center justify-center w-48 h-48 mx-auto">
                            <div className="relative w-full h-full">
                                {/* 外层能量环 */}
                                <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30 animate-spin-slow"></div>

                                {/* 中层能量环 - 反向旋转 */}
                                <div className="absolute inset-4 rounded-full border-2 border-violet-400/40 animate-spin-reverse"></div>

                                {/* 内层光晕环 */}
                                <div className="absolute inset-8 rounded-full border border-pink-400/50 animate-dream-glow"></div>

                                {/* 飘动粒子 */}
                                <div className="absolute top-4 left-8 w-2 h-2 bg-indigo-400 rounded-full animate-particle-float opacity-60"></div>
                                <div className="absolute top-12 right-6 w-1.5 h-1.5 bg-violet-400 rounded-full animate-particle-float opacity-50" style={{ animationDelay: '1s' }}></div>
                                <div className="absolute bottom-8 left-12 w-1 h-1 bg-pink-400 rounded-full animate-particle-float opacity-70" style={{ animationDelay: '2s' }}></div>
                                <div className="absolute bottom-12 right-8 w-2 h-2 bg-blue-400 rounded-full animate-particle-float opacity-40" style={{ animationDelay: '1.5s' }}></div>

                                {/* 中心星云图标 */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative">
                                        <Sparkles className="h-12 w-12 text-indigo-400 animate-dream-pulse drop-shadow-lg" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-violet-400 blur-md opacity-50 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="progress-text-section mt-8">
                            <h3 className="progress-title text-xl font-medium text-center bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 bg-clip-text text-transparent">
                                梦境正在解锁中 ✨
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 opacity-80">
                                AI 正在穿越您的潜意识，探寻梦的秘密...
                            </p>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelAnalysis}
                                className="cancel-button mt-8 mx-auto flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/90 transition-all duration-300 shadow-lg backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50"
                            >
                                <span className="relative z-10">停止解析</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 错误提示 */}
            {error && (
                <Alert variant="destructive" className="error-alert">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setError(null)}
                        className="ml-auto"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </Alert>
            )}

            {/* 分析结果 */}
            {!isAnalyzing && analysisResult && (
                <div className="analysis-results">
                    <div className="results-header">
                        <h3 className="results-title">
                            <Brain className="h-5 w-5" />
                            {t('dreams:detail.aiAnalysisResult', 'AI梦境分析结果')}
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={startAnalysis}
                            className="px-6 py-3 rounded-full text-sm font-medium border-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/30 hover:from-indigo-100 hover:to-violet-100 dark:hover:from-indigo-900/50 dark:hover:to-violet-900/50 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300 shadow-sm backdrop-blur-sm"
                        >
                            <Sparkles className="h-4 w-4 mr-2 text-indigo-500" />
                            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent font-medium">
                                {t('dreams:detail.reAnalyze', '重新解析')}
                            </span>
                        </Button>
                    </div>

                    {/* 专业说明 - 静态文本 */}
                    <div className="professional-note">
                        <p>{t('dreams:detail.aiAnalysisDescription', '基于心理学理论和AI技术为您提供梦境解析，仅供参考和自我探索。')}</p>
                    </div>

                    <div className="results-content">
                        {/* 核心洞察 - 始终展开 */}
                        {analysisResult.analysis_summary && renderAnalysisSummary(analysisResult.analysis_summary)}

                        {/* 可折叠板块 */}
                        <div className="collapsible-sections">
                            {/* 梦境故事线 */}
                            {analysisResult.dream_narrative &&
                                renderCollapsibleSection(
                                    analysisResult.dream_narrative,
                                    BookOpen,
                                    renderDreamNarrative(analysisResult.dream_narrative)
                                )}

                            {/* 核心象征 */}
                            {analysisResult.symbol_deep_dive &&
                                renderCollapsibleSection(
                                    analysisResult.symbol_deep_dive,
                                    Sparkles,
                                    renderSymbolDeepDive(analysisResult.symbol_deep_dive)
                                )}

                            {/* 成长启示 */}
                            {analysisResult.growth_guidance &&
                                renderCollapsibleSection(
                                    analysisResult.growth_guidance,
                                    Heart,
                                    renderGrowthGuidance(analysisResult.growth_guidance)
                                )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DreamAIAnalyzer;
