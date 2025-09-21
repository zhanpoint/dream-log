import React from 'react';
import DreamAssistant from '@/components/ai/DreamAssistant';
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import { useI18nContext } from '@/contexts/I18nContext';

const DreamAssistantPage = () => {
    const { t } = useI18nContext();

    return (
        <>
            <MultilingualSeo
                title={t('assistant.pageTitle', '梦境助手 - Dream Log')}
                description={t('assistant.pageDescription', '与AI梦境助手对话，探索梦境的奥秘')}
                keywords={t('assistant.pageKeywords', '梦境助手,AI对话,梦境解析')}
            />
            <DreamAssistant />
        </>
    );
};

export default DreamAssistantPage;
