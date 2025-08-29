import React from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import notification from '@/utils/notification';

/**
 * 简化的语言设置组件
 */
const LanguageSettings = () => {
    const { t, i18n } = useTranslation();
    const supportedLanguages = SUPPORTED_LANGUAGES;
    const isChangingLanguage = false; // 简化实现

    const changeLanguage = async (language) => {
        await i18n.changeLanguage(language);
        notification.success(t('settings:language.changeSuccess'));
    };

    /**
     * 处理语言切换
     */
    const handleLanguageChange = async (languageCode) => {
        if (languageCode === i18n.language) return;

        try {
            const success = await changeLanguage(languageCode);

            if (success) {
                notification.success(t('settings.language.changeSuccess', '语言切换成功'));
            } else {
                notification.error(t('settings.language.changeFailed', '语言切换失败'));
            }
        } catch (error) {
            notification.error(t('settings.language.changeFailed', '语言切换失败'));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    {t('settings.language.title', '语言设置')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Label className="text-base font-medium mb-4 block">
                        {t('settings.language.selectLanguage', '选择语言')}
                    </Label>
                    <RadioGroup
                        value={i18n.language}
                        onValueChange={handleLanguageChange}
                        disabled={isChangingLanguage}
                        className="space-y-3"
                    >
                        {Object.entries(supportedLanguages).map(([code, config]) => (
                            <div
                                key={code}
                                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                <RadioGroupItem
                                    value={code}
                                    id={code}
                                    disabled={isChangingLanguage}
                                />
                                <Label
                                    htmlFor={code}
                                    className="flex items-center gap-3 cursor-pointer flex-1"
                                >
                                    <span className="text-xl">
                                        {config.flag}
                                    </span>
                                    <div>
                                        <div className="font-medium">{config.nativeName}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {config.name}
                                        </div>
                                    </div>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>

                    {isChangingLanguage && (
                        <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">
                                {t('settings.language.changing', '正在切换语言...')}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default LanguageSettings;
