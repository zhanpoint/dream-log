import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18nContext } from '@/contexts/I18nContext';

/**
 * 重复梦境选择组件
 * @param {Object} props
 * @param {boolean} props.isRecurring - 是否为重复梦境
 * @param {function} props.onRecurringChange - 重复梦境状态改变回调
 * @param {string} props.recurringElements - 重复元素描述
 * @param {function} props.onElementsChange - 重复元素改变回调
 * @param {string} props.className - 额外的CSS类名
 */
const RecurringDreamField = ({
    isRecurring,
    onRecurringChange,
    recurringElements,
    onElementsChange,
    className = ''
}) => {
    const [localError, setLocalError] = React.useState('');
    const { t } = useI18nContext();

    const handleTextChange = (e) => {
        const newValue = e.target.value;
        const currentLength = recurringElements.length;

        if (newValue.length < currentLength) {
            // 删除字符，允许操作
            onElementsChange(newValue);
            setLocalError('');
        } else if (newValue.length <= 10) {
            // 添加字符且不超过10个，允许操作
            onElementsChange(newValue);
            setLocalError('');
        } else {
            // 超过10个字符，不允许输入
            setLocalError(t('dreams:create.form.recurringLimitError', '重复元素不能超过10字符'));
        }
    };

    React.useEffect(() => {
        if (!isRecurring) {
            setLocalError('');
        }
    }, [isRecurring]);
    return (
        <div className={`enhanced-input-wrapper ${className}`}>
            <div className="checkbox-wrapper">
                <Checkbox
                    id="is_recurring"
                    checked={isRecurring}
                    onCheckedChange={onRecurringChange}
                    className="recurring-checkbox"
                />
                <Label
                    htmlFor="is_recurring"
                    className="recurring-label cursor-pointer select-none"
                >
                    {t('dreams:create.form.isRecurring', '这是一个重复梦境')}
                </Label>
            </div>
            {isRecurring && (
                <div className="recurring-container mt-3">
                    <div className="relative">
                        <Textarea
                            placeholder={t('dreams:create.form.recurringPlaceholder', '描述重复出现的元素...')}
                            value={recurringElements}
                            onChange={handleTextChange}
                            className={`recurring-textarea pr-16 ${localError ? 'border-red-500' : ''}`}
                            rows={2}
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                            <span className={recurringElements.length > 10 ? 'text-red-500 font-medium' : ''}>
                                {recurringElements.length}/10
                            </span>
                        </div>
                    </div>
                    {localError && (
                        <div className="text-xs text-red-500 mt-1">{localError}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RecurringDreamField;
