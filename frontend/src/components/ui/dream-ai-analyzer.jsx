/*
AI梦境分析组件
支持实时分析过程展示和结果渲染
*/
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, AlertCircle, CheckCircle, Clock, Search, BookOpen, Lightbulb, Loader2, X, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
// import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import notification from '@/utils/notification';
import { cn } from '@/lib/utils';
import './css/ai-dream-analyzer.css';

// 分析状态配置
const ANALYSIS_STATUS = {
    starting: { label: '初始化分析...', icon: Loader2, color: '#6366f1' },
    query_expansion: { label: '分析梦境主题...', icon: Search, color: '#8b5cf6' },
    retrieving: { label: '检索相关知识...', icon: BookOpen, color: '#10b981' },
    analyzing: { label: 'AI深度分析中...', icon: Brain, color: '#f59e0b' },
    completed: { label: '分析完成', icon: CheckCircle, color: '#06b6d4' },
    error: { label: '分析失败', icon: AlertCircle, color: '#ef4444' }
};

const DreamAIAnalyzer = ({ dream, onAnalysisComplete }) => {
    const { user } = useAuth();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [currentMessage, setCurrentMessage] = useState('');
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);
    const [taskId, setTaskId] = useState(null);
    const [expandedSections, setExpandedSections] = useState(new Set());

    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const statusPollingRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    useEffect(() => {
        // 组件加载时立即建立WebSocket连接
        connectWebSocket();

        return () => {
            // 清理WebSocket连接和定时器
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (statusPollingRef.current) {
                clearInterval(statusPollingRef.current);
            }
        };
    }, []);

    const connectWebSocket = () => {
        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws/dream/analysis/`;

            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                reconnectAttempts.current = 0;

                // 发送心跳确认连接
                wsRef.current.send(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now()
                }));
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    // 忽略无效的WebSocket消息
                }
            };

            wsRef.current.onclose = (event) => {
                // 如果正在分析中且非正常关闭，尝试重连
                if (isAnalyzing && event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectWebSocket();
                    }, 2000 * reconnectAttempts.current);
                }
            };

            wsRef.current.onerror = () => {
                // WebSocket错误，连接会自动关闭并触发重连
            };

        } catch (error) {
            // WebSocket连接失败，依赖HTTP轮询
        }
    };

    // 状态轮询函数
    const startStatusPolling = (taskId) => {
        // 清除现有的轮询
        if (statusPollingRef.current) {
            clearInterval(statusPollingRef.current);
        }

        statusPollingRef.current = setInterval(async () => {
            try {
                const response = await api.get(`/ai/dream-analysis/status/${taskId}/`);

                if (response.data.success) {
                    const statusInfo = response.data.status_info;

                    // 更新状态
                    if (statusInfo.status === 'SUCCESS') {
                        // 分析完成
                        if (statusInfo.result && statusInfo.result.result && statusInfo.result.result.analysis_result) {
                            setAnalysisResult(statusInfo.result.result.analysis_result);
                            setIsAnalyzing(false);
                            setAnalysisStatus('completed');
                            setProgress(100);
                            clearInterval(statusPollingRef.current);

                            if (onAnalysisComplete) {
                                onAnalysisComplete(statusInfo.result.result.analysis_result);
                            }
                            notification.success('AI梦境分析完成！');
                        }
                    } else if (statusInfo.status === 'FAILURE') {
                        // 分析失败
                        const errorMsg = statusInfo.error || statusInfo.result?.error || '分析失败';
                        handleAnalysisError(errorMsg);
                        clearInterval(statusPollingRef.current);
                    } else if (statusInfo.status === 'PENDING' || statusInfo.status === 'STARTED') {
                        // 继续等待，保持当前状态
                        // HTTP轮询不更新进度，进度由WebSocket更新
                    }
                }
            } catch (error) {
                // 网络错误时继续轮询，其他错误停止轮询
                if (error.response?.status >= 500 && isAnalyzing) {
                    // 服务器错误且分析进行中，继续轮询
                    return;
                } else {
                    // 停止轮询
                    clearInterval(statusPollingRef.current);
                    if (isAnalyzing) {
                        handleAnalysisError('获取分析状态失败');
                    }
                }
            }
        }, 2000); // 每2秒轮询一次
    };

    const stopStatusPolling = () => {
        if (statusPollingRef.current) {
            clearInterval(statusPollingRef.current);
            statusPollingRef.current = null;
        }
    };

    const handleWebSocketMessage = (data) => {
        switch (data.type) {
            case 'dream_analysis_update':
                handleAnalysisUpdate(data);
                break;
            case 'connection_established':
                // 连接已建立，无需特殊处理
                break;
            case 'pong':
                // 心跳响应
                break;
            case 'error':
                handleAnalysisError(data.message);
                break;
            default:
                // 忽略未知消息类型
                break;
        }
    };

    const handleAnalysisUpdate = (data) => {
        setAnalysisStatus(data.status);
        setProgress(data.progress || 0);
        setCurrentMessage(data.data?.message || '');

        if (data.status === 'completed' && data.data?.analysis_result) {
            setAnalysisResult(data.data.analysis_result);
            setIsAnalyzing(false);
            stopStatusPolling(); // 停止HTTP轮询
            if (onAnalysisComplete) {
                onAnalysisComplete(data.data.analysis_result);
            }
            notification.success('AI梦境分析完成！');
        } else if (data.status === 'error') {
            handleAnalysisError(data.data?.error || '分析过程中出现错误');
        }
    };

    const handleAnalysisError = (errorMessage) => {
        // 停止状态轮询
        stopStatusPolling();

        setError(errorMessage);
        setIsAnalyzing(false);
        setAnalysisStatus('error');
        notification.error(`分析失败: ${errorMessage}`);
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

            setIsAnalyzing(true);
            setAnalysisStatus('starting');
            setProgress(0);
            setCurrentMessage('正在启动AI分析...');
            setError(null);
            setAnalysisResult(null);

            // 使用用户ID生成WebSocket频道ID，与后端房间组保持一致
            const websocketChannelId = `dream_analysis_group_${user.id}`;

            // 如果WebSocket未连接，尝试重新连接
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                connectWebSocket();
                // 不等待连接，继续进行分析请求，依赖HTTP轮询作为备用
            }

            // 发送分析请求
            const response = await api.post('/ai/dream-analysis/start/', {
                dream_data: dreamData,
                websocket_channel_id: websocketChannelId,
                use_rag: true
            });

            if (response.data.success) {
                setTaskId(response.data.task_id);
                // 开始状态轮询
                startStatusPolling(response.data.task_id);

                // WebSocket连接已建立，无需额外通知
            } else {
                throw new Error(response.data.error || '启动分析失败');
            }

        } catch (error) {
            handleAnalysisError(error.message || '启动分析失败');
        }
    };

    const cancelAnalysis = async () => {
        try {
            // 停止状态轮询
            stopStatusPolling();

            if (taskId) {
                await api.post(`/ai/dream-analysis/cancel/${taskId}/`);

                // 取消操作已通过HTTP API完成
            }

            setIsAnalyzing(false);
            setAnalysisStatus('idle');
            setProgress(0);
            setCurrentMessage('');
            setTaskId(null);
            notification.info('已取消分析');

        } catch (error) {
            notification.error('取消分析失败');
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

    const renderProfessionalIntroduction = (analysis) => {
        const intro = analysis.professional_introduction;
        return (
            <Card className="professional-intro-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        专业分析说明
                    </CardTitle>
                </CardHeader>
                <CardContent className="intro-content">
                    <div className="intro-section">
                        <h4>分析方法</h4>
                        <p>{intro.analysis_approach}</p>
                    </div>
                    <div className="intro-section">
                        <h4>重要说明</h4>
                        <p>{intro.confidentiality_note}</p>
                    </div>
                    <div className="intro-section empathy">
                        <h4>共情表达</h4>
                        <p>{intro.empathy_statement}</p>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderEmotionalAnalysis = (analysis) => {
        const emotional = analysis.emotional_analysis;
        return (
            <Card className="emotional-analysis-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5" />
                        情绪分析
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="emotion-journey">
                        <h4>情绪历程</h4>
                        <div className="journey-stages">
                            <div className="stage">
                                <h5>睡前</h5>
                                <p>{emotional.emotion_journey?.pre_sleep}</p>
                            </div>
                            <div className="stage">
                                <h5>梦中</h5>
                                <p>{emotional.emotion_journey?.during_dream}</p>
                            </div>
                            <div className="stage">
                                <h5>醒后</h5>
                                <p>{emotional.emotion_journey?.post_wake}</p>
                            </div>
                        </div>
                    </div>
                    <div className="emotional-insights">
                        <div className="insight-item">
                            <h5>情绪模式</h5>
                            <p>{emotional.emotional_patterns}</p>
                        </div>
                        <div className="insight-item">
                            <h5>核心情感信息</h5>
                            <p>{emotional.core_emotional_message}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderSymbolicExploration = (analysis) => {
        const symbolic = analysis.symbolic_exploration;

        return (
            <Card className="symbolic-exploration-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        象征探索
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* 关键象征 */}
                    {symbolic.key_symbols && symbolic.key_symbols.length > 0 && (
                        <div className="symbols-section">
                            <h4>关键象征</h4>
                            {symbolic.key_symbols.map((symbol, index) => (
                                <div key={index} className="symbol-card">
                                    <h5>{symbol.symbol}</h5>
                                    <div className="symbol-details">
                                        <p><strong>普遍含义:</strong> {symbol.universal_meaning}</p>
                                        <p><strong>个性化解读:</strong> {symbol.personalized_interpretation}</p>
                                        <p><strong>情感共鸣:</strong> {symbol.emotional_resonance}</p>
                                        <p><strong>生活联系:</strong> {symbol.life_connection}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 叙事结构 */}
                    {symbolic.narrative_structure && (
                        <div className="narrative-section">
                            <h4>梦境叙事结构</h4>
                            <div className="narrative-grid">
                                <div className="narrative-item">
                                    <h5>梦境场景</h5>
                                    <p>{symbolic.narrative_structure.dream_setting}</p>
                                </div>
                                <div className="narrative-item">
                                    <h5>情节发展</h5>
                                    <p>{symbolic.narrative_structure.plot_development}</p>
                                </div>
                                <div className="narrative-item">
                                    <h5>高潮分析</h5>
                                    <p>{symbolic.narrative_structure.climax_analysis}</p>
                                </div>
                                <div className="narrative-item">
                                    <h5>结局模式</h5>
                                    <p>{symbolic.narrative_structure.resolution_pattern}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 原型分析 */}
                    {symbolic.archetypal_presence && (
                        <div className="archetypal-section">
                            <h4>原型分析</h4>
                            <p>{symbolic.archetypal_presence}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const renderGentleInterpretations = (analysis) => {
        const interpretations = analysis.gentle_interpretations;

        return (
            <Card className="interpretations-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        温和解释
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* 主要假设 */}
                    {interpretations.primary_hypothesis && (
                        <div className="primary-hypothesis">
                            <h4>主要解释</h4>
                            <div className="hypothesis-content">
                                <p className="interpretation">{interpretations.primary_hypothesis.interpretation}</p>
                                <div className="meta-info">
                                    <Badge variant="outline">
                                        可信度: {interpretations.primary_hypothesis.confidence_level}
                                    </Badge>
                                    <p className="evidence"><strong>支持依据:</strong> {interpretations.primary_hypothesis.supporting_evidence}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 其他视角 */}
                    {interpretations.alternative_perspectives && interpretations.alternative_perspectives.length > 0 && (
                        <div className="alternative-perspectives">
                            <h4>其他可能的解释</h4>
                            {interpretations.alternative_perspectives.map((perspective, index) => (
                                <div key={index} className="perspective-item">
                                    <p><strong>解释:</strong> {perspective.interpretation}</p>
                                    <p><strong>适用条件:</strong> {perspective.context}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 反思问题 */}
                    {interpretations.questions_for_reflection && interpretations.questions_for_reflection.length > 0 && (
                        <div className="reflection-questions">
                            <h4>反思问题</h4>
                            <ul>
                                {interpretations.questions_for_reflection.map((question, index) => (
                                    <li key={index}>{question}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const renderGrowthGuidance = (analysis) => {
        const guidance = analysis.growth_oriented_guidance;

        return (
            <Card className="growth-guidance-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        成长导向指导
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="guidance-sections">
                        {/* 自我认知洞察 */}
                        <div className="guidance-section">
                            <h4>自我认知洞察</h4>
                            <p>{guidance.self_awareness_insights}</p>
                        </div>

                        {/* 情绪调节 */}
                        <div className="guidance-section">
                            <h4>情绪调节</h4>
                            <p>{guidance.emotional_regulation}</p>
                        </div>

                        {/* 生活融合 */}
                        <div className="guidance-section">
                            <h4>生活融合</h4>
                            <p>{guidance.life_integration}</p>
                        </div>

                        {/* 治疗建议 */}
                        {guidance.therapeutic_suggestions && (
                            <div className="therapeutic-suggestions">
                                <h4>具体建议</h4>
                                <div className="suggestions-grid">
                                    <div className="suggestion-item">
                                        <h5>即时行动</h5>
                                        <p>{guidance.therapeutic_suggestions.immediate_actions}</p>
                                    </div>
                                    <div className="suggestion-item">
                                        <h5>长期实践</h5>
                                        <p>{guidance.therapeutic_suggestions.long_term_practices}</p>
                                    </div>
                                    <div className="suggestion-item">
                                        <h5>正念方法</h5>
                                        <p>{guidance.therapeutic_suggestions.mindfulness_approaches}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderEmpoweringConclusion = (analysis) => {
        const conclusion = analysis.empowering_conclusion;

        return (
            <Card className="conclusion-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        温暖结语
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="conclusion-content">
                        <div className="takeaways">
                            <h4>关键洞察</h4>
                            <p className="key-message">{conclusion.key_takeaways}</p>
                        </div>

                        <div className="affirmation">
                            <h4>内在智慧肯定</h4>
                            <p className="affirmation-text">{conclusion.affirmation}</p>
                        </div>

                        <div className="future-orientation">
                            <h4>未来展望</h4>
                            <p>{conclusion.future_orientation}</p>
                        </div>

                        <div className="closing-reflection">
                            <h4>结语</h4>
                            <p className="closing-message">{conclusion.closing_reflection}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="dream-ai-analyzer">
            {/* 分析触发按钮 */}
            {!isAnalyzing && !analysisResult && (
                <div className="analyzer-trigger">
                    <Button
                        onClick={startAnalysis}
                        className="ai-analyze-button"
                        size="lg"
                        disabled={!dream?.content}
                    >
                        <Brain className="h-5 w-5" />
                        AI解梦分析
                        <Sparkles className="h-4 w-4" />
                    </Button>
                    <p className="analyzer-description">
                        使用先进的AI技术，结合心理学理论对你的梦境进行深度分析
                    </p>
                </div>
            )}

            {/* 分析进度 */}
            {isAnalyzing && (
                <Card className="analysis-progress-card">
                    <CardHeader>
                        <div className="progress-header">
                            <CardTitle className="flex items-center gap-2">
                                {React.createElement(ANALYSIS_STATUS[analysisStatus]?.icon || Loader2, {
                                    className: cn("h-5 w-5", analysisStatus === 'starting' || analysisStatus === 'analyzing' ? "animate-spin" : "")
                                })}
                                AI分析进行中
                            </CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelAnalysis}
                                className="cancel-button"
                            >
                                <X className="h-4 w-4" />
                                取消
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="progress-content">
                            <div className="progress-info">
                                <span className="progress-status">
                                    {ANALYSIS_STATUS[analysisStatus]?.label || '处理中...'}
                                </span>
                                <span className="progress-percentage">{progress}%</span>
                            </div>
                            <Progress value={progress} className="progress-bar" />
                            {currentMessage && (
                                <p className="progress-message">{currentMessage}</p>
                            )}
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
            {analysisResult && (
                <div className="analysis-results">
                    <div className="results-header">
                        <h3 className="results-title">
                            <Brain className="h-5 w-5" />
                            AI梦境分析结果
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setAnalysisResult(null);
                                setError(null);
                            }}
                        >
                            重新分析
                        </Button>
                    </div>

                    <div className="results-content">
                        {/* 专业介绍 */}
                        {analysisResult.professional_introduction && renderProfessionalIntroduction(analysisResult)}

                        <Separator className="my-6" />

                        {/* 情绪分析 */}
                        {analysisResult.emotional_analysis && renderEmotionalAnalysis(analysisResult)}

                        <Separator className="my-6" />

                        {/* 象征探索 */}
                        {analysisResult.symbolic_exploration && renderSymbolicExploration(analysisResult)}

                        <Separator className="my-6" />

                        {/* 温和解释 */}
                        {analysisResult.gentle_interpretations && renderGentleInterpretations(analysisResult)}

                        <Separator className="my-6" />

                        {/* 成长指导 */}
                        {analysisResult.growth_oriented_guidance && renderGrowthGuidance(analysisResult)}

                        <Separator className="my-6" />

                        {/* 专业考虑 */}
                        {analysisResult.professional_considerations && (
                            <Card className="professional-considerations-card">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Brain className="h-5 w-5" />
                                        专业考虑
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="considerations-grid">
                                        <div className="consideration-item">
                                            <h4>理论基础</h4>
                                            <p>{analysisResult.professional_considerations.theoretical_foundation}</p>
                                        </div>
                                        <div className="consideration-item">
                                            <h4>分析局限性</h4>
                                            <p>{analysisResult.professional_considerations.limitations_acknowledgment}</p>
                                        </div>
                                        {analysisResult.professional_considerations.professional_support_note && (
                                            <div className="consideration-item support-note">
                                                <h4>专业建议</h4>
                                                <p>{analysisResult.professional_considerations.professional_support_note}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Separator className="my-6" />

                        {/* 温暖结语 */}
                        {analysisResult.empowering_conclusion && renderEmpoweringConclusion(analysisResult)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DreamAIAnalyzer;
