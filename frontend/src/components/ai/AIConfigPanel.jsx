import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/services/api';
import notification from '@/utils/notification';
import { Loader2 } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';

const AIConfigPanel = ({ config, onUpdate }) => {
    const { t } = useI18nContext();
    const [formData, setFormData] = useState({
        assistant_name: t('assistant.settings.defaultName', '梦境助手'),
        interpretation_style: 'balanced',
        preferred_dimensions: [],
        response_length: 'moderate',
        enable_auto_image_generation: true,
        enable_follow_up_questions: true,
        ...config
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (config) {
            setFormData(prev => ({ ...prev, ...config }));
        }
    }, [config]);

    const dimensions = [
        { value: 'psychological', label: t('assistant.settings.dimensions.psychological', '心理学分析') },
        { value: 'symbolic', label: t('assistant.settings.dimensions.symbolic', '象征学解读') },
        { value: 'biological', label: t('assistant.settings.dimensions.biological', '生物医学角度') },
        { value: 'spiritual', label: t('assistant.settings.dimensions.spiritual', '灵性维度') },
        { value: 'personal_growth', label: t('assistant.settings.dimensions.personalGrowth', '个人成长') }
    ];

    const handleDimensionChange = (dimension, checked) => {
        setFormData(prev => ({
            ...prev,
            preferred_dimensions: checked
                ? [...prev.preferred_dimensions, dimension]
                : prev.preferred_dimensions.filter(d => d !== dimension)
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const response = await api.put('/ai/assistant/config/', formData);
            if (response.data) {
                onUpdate(response.data);
                notification.success(t('assistant.settings.configUpdated', '配置已更新'));
            }
        } catch (error) {
            notification.error(t('assistant.settings.updateConfigFailed', '更新配置失败'));
            console.error('Update config error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 py-4">
            {/* 助手名称 */}
            <div className="space-y-2">
                <Label htmlFor="assistant-name">{t('assistant.settings.assistantName', '助手名称')}</Label>
                <Input
                    id="assistant-name"
                    value={formData.assistant_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, assistant_name: e.target.value }))}
                    placeholder={t('assistant.settings.assistantNamePlaceholder', '给您的助手起个名字')}
                />
            </div>

            {/* 解读风格 */}
            <div className="space-y-3">
                <Label>{t('assistant.settings.interpretationStyle', '解读风格')}</Label>
                <RadioGroup
                    value={formData.interpretation_style}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, interpretation_style: value }))}
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="professional" id="professional" />
                        <Label htmlFor="professional">{t('assistant.settings.styles.professional', '专业学术')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="friendly" id="friendly" />
                        <Label htmlFor="friendly">{t('assistant.settings.styles.friendly', '亲切友好')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="poetic" id="poetic" />
                        <Label htmlFor="poetic">{t('assistant.settings.styles.poetic', '诗意浪漫')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="balanced" id="balanced" />
                        <Label htmlFor="balanced">{t('assistant.settings.styles.balanced', '平衡综合')}</Label>
                    </div>
                </RadioGroup>
            </div>

            {/* 偏好解读维度 */}
            <div className="space-y-3">
                <Label>{t('assistant.settings.preferredDimensions', '偏好解读维度')}</Label>
                <div className="space-y-2">
                    {dimensions.map(dim => (
                        <div key={dim.value} className="flex items-center space-x-2">
                            <Checkbox
                                id={dim.value}
                                checked={formData.preferred_dimensions.includes(dim.value)}
                                onCheckedChange={(checked) => handleDimensionChange(dim.value, checked)}
                            />
                            <Label
                                htmlFor={dim.value}
                                className="text-sm font-normal cursor-pointer"
                            >
                                {dim.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* 回复长度 */}
            <div className="space-y-3">
                <Label>{t('assistant.settings.responseLength', '回复长度')}</Label>
                <RadioGroup
                    value={formData.response_length}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, response_length: value }))}
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="concise" id="concise" />
                        <Label htmlFor="concise">{t('assistant.settings.lengths.concise', '简洁')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="moderate" id="moderate" />
                        <Label htmlFor="moderate">{t('assistant.settings.lengths.medium', '适中')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="detailed" id="detailed" />
                        <Label htmlFor="detailed">{t('assistant.settings.lengths.detailed', '详细')}</Label>
                    </div>
                </RadioGroup>
            </div>

            {/* 功能开关 */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor="auto-image" className="cursor-pointer">
                        {t('assistant.settings.autoGenerateImage', '自动生成梦境图像')}
                    </Label>
                    <Switch
                        id="auto-image"
                        checked={formData.enable_auto_image_generation}
                        onCheckedChange={(checked) =>
                            setFormData(prev => ({ ...prev, enable_auto_image_generation: checked }))
                        }
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Label htmlFor="follow-up" className="cursor-pointer">
                        {t('assistant.settings.enableFollowUp', '启用追问功能')}
                    </Label>
                    <Switch
                        id="follow-up"
                        checked={formData.enable_follow_up_questions}
                        onCheckedChange={(checked) =>
                            setFormData(prev => ({ ...prev, enable_follow_up_questions: checked }))
                        }
                    />
                </div>
            </div>

            {/* 保存按钮 */}
            <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.saving', '保存中...')}
                    </>
                ) : (
                    t('assistant.settings.saveSettings', '保存设置')
                )}
            </Button>
        </div>
    );
};

export default AIConfigPanel;
