import { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/utils/ui';
import api from '@/services/api';
import notification from '@/utils/notification';
import '@/styles/ui/ai-title-generator.css';
import { useI18nContext } from '@/contexts/I18nContext';

/**
 * AI生成梦境标题按钮组件
 * @param {Object} props
 * @param {string} props.dreamContent - 梦境内容
 * @param {function} props.onTitleGenerated - 标题生成成功的回调函数
 * @param {string} props.className - 额外的CSS类名
 * @param {boolean} props.disabled - 是否禁用按钮
 */
const AiTitleGenerator = ({
    dreamContent = '',
    onTitleGenerated,
    className = '',
    disabled = false
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const { t } = useI18nContext();

    const handleGenerateTitle = async () => {
        // 验证梦境内容
        if (!dreamContent || dreamContent.trim().length < 25) {
            notification.error(t('dreams:create.form.titleGenContentTooShort', '梦境内容字数过少，无法生成高匹配的标题'));
            return;
        }

        setIsGenerating(true);

        try {
            const response = await api.post('/ai/generate-title/', {
                dream_content: dreamContent.trim()
            });

            if (response.data.success) {
                // 调用回调函数，将生成的标题传递给父组件
                if (onTitleGenerated) {
                    onTitleGenerated(response.data.title);
                }
                notification.success(t('dreams:create.form.titleGenSuccess', 'AI标题生成成功！'));
            } else {
                notification.error(response.data.error || t('dreams:create.form.titleGenFailed', '标题生成失败'));
            }
        } catch (error) {
            console.error('AI生成标题失败:', error);

            if (error.response?.data?.error) {
                notification.error(error.response.data.error);
            } else if (error.response?.status === 401) {
                notification.error(t('auth.loginRequired', '请先登录后再使用AI功能'));
            } else if (error.response?.status >= 500) {
                notification.error(t('common.serverUnavailable', '服务器暂时不可用，请稍后再试'));
            } else {
                notification.error(t('dreams:create.form.titleGenFailedRetry', 'AI生成标题失败，请重试'));
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateTitle}
            disabled={disabled || isGenerating}
            className={cn(
                'ai-title-generator-btn',
                'flex items-center gap-1 px-2 py-1 h-7', // 减小按钮尺寸和内边距
                'bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100',
                'border-purple-200 hover:border-purple-300',
                'text-purple-700 hover:text-purple-800',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'shadow-sm hover:shadow-md',
                'text-xs', // 确保文字大小一致
                className
            )}
            title={t('dreams:create.form.generateTitle', 'AI生成梦境标题')}
        >
            {isGenerating ? (
                <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">{t('common.saving', '生成中...')}</span>
                </>
            ) : (
                <>
                    <Wand2 className="h-3 w-3" />
                    <span className="text-xs">{t('dreams:create.form.generate', 'AI生成')}</span>
                </>
            )}
        </Button>
    );
};

export default AiTitleGenerator;