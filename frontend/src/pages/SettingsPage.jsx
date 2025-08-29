import React, { useState } from 'react';
import { Settings, User, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import './css/SettingsPage.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import SettingsNavigation from '@/components/settings/SettingsNavigation';
import ProfileSettings from '@/components/settings/ProfileSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';

import LogoutButton from '@/components/settings/LogoutButton';

/**
 * 用户设置页面主组件
 * 包含个人资料和账号安全两个主要部分
 */
const SettingsPage = () => {
    const { t } = useTranslation('common');
    const [activeTab, setActiveTab] = useState('profile');

    return (
        <>
            <MultilingualSeo
                title={t('settings.pageTitle', '账户设置')}
                description={t('settings.pageDescription', '管理您的账户设置和个人资料')}
                keywords={t('settings.pageKeywords', '设置,个人资料,安全')}
            />
            <div className="min-h-screen bg-background">
                <div className="container mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
                    {/* 页面标题 */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Settings className="h-8 w-8 text-primary" />
                                <h1 className="text-3xl font-bold tracking-tight">{t('settings.pageTitle', '账户设置')}</h1>
                            </div>
                            <LogoutButton />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* 左侧导航 */}
                        <div className="lg:col-span-1">
                            <SettingsNavigation
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                            />
                        </div>

                        {/* 主要内容区域 */}
                        <div className="lg:col-span-3">
                            <Card className="shadow-sm">
                                <Tabs value={activeTab} className="w-full">
                                    <TabsContent value="profile" className="mt-0">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <User className="h-5 w-5" />
                                                {t('settings.profile.title', '个人资料')}
                                            </CardTitle>
                                        </CardHeader>
                                        <Separator />
                                        <CardContent className="pt-6">
                                            <ProfileSettings />
                                        </CardContent>
                                    </TabsContent>

                                    <TabsContent value="security" className="mt-0">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Shield className="h-5 w-5" />
                                                {t('settings.security.title', '账号与安全')}
                                            </CardTitle>
                                        </CardHeader>
                                        <Separator />
                                        <CardContent className="pt-6">
                                            <SecuritySettings />
                                        </CardContent>
                                    </TabsContent>
                                </Tabs>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;
