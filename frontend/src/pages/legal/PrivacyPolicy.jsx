import React from 'react';
import { motion } from 'framer-motion';
import { useI18nContext } from '@/contexts/I18nContext';
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import ModernFooter from '@/components/layout/ModernFooter';

/**
 * 隐私政策页面
 */
const PrivacyPolicy = () => {
    const { t } = useI18nContext();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 dark:from-black dark:via-purple-950/30 dark:to-black light:from-white light:via-purple-50 light:to-gray-50">
            <MultilingualSeo
                title={`${t('privacyPolicy.title')} - Dream Log`}
                description={t('privacyPolicy.description')}
                keywords={t('privacyPolicy.keywords')}
                path="/privacy-policy"
            />

            <div className="relative max-w-4xl mx-auto px-6 py-24">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-8"
                >
                    <motion.div variants={itemVariants} className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-white dark:text-white light:text-gray-900 mb-6">
                            {t('privacyPolicy.title')}
                        </h1>
                        <p className="text-lg text-gray-300 dark:text-gray-300 light:text-gray-600">
                            {t('privacyPolicy.lastUpdated')}{new Date().getFullYear()}{t('common.date.year')}{new Date().getMonth() + 1}{t('common.date.month')}{new Date().getDate()}{t('common.date.day')}
                        </p>
                    </motion.div>

                    <motion.div variants={itemVariants} className="prose prose-lg prose-invert light:prose-gray max-w-none">
                        <div className="bg-slate-800/50 dark:bg-gray-900/50 light:bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-6">

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('privacyPolicy.sections.collection.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('privacyPolicy.sections.collection.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const types = t('privacyPolicy.sections.collection.types', { returnObjects: true });
                                            if (Array.isArray(types)) {
                                                return types.map((type, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: type }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('privacyPolicy.sections.usage.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('privacyPolicy.sections.usage.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const purposes = t('privacyPolicy.sections.usage.purposes', { returnObjects: true });
                                            if (Array.isArray(purposes)) {
                                                return purposes.map((purpose, index) => (
                                                    <li key={index}>{purpose}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('privacyPolicy.sections.protection.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('privacyPolicy.sections.protection.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const measures = t('privacyPolicy.sections.protection.measures', { returnObjects: true });
                                            if (Array.isArray(measures)) {
                                                return measures.map((measure, index) => (
                                                    <li key={index}>{measure}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('privacyPolicy.sections.sharing.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('privacyPolicy.sections.sharing.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const exceptions = t('privacyPolicy.sections.sharing.exceptions', { returnObjects: true });
                                            if (Array.isArray(exceptions)) {
                                                return exceptions.map((exception, index) => (
                                                    <li key={index}>{exception}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('privacyPolicy.sections.userRights.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('privacyPolicy.sections.userRights.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const rights = t('privacyPolicy.sections.userRights.rights', { returnObjects: true });
                                            if (Array.isArray(rights)) {
                                                return rights.map((right, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: right }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('privacyPolicy.sections.cookies.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('privacyPolicy.sections.cookies.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const purposes = t('privacyPolicy.sections.cookies.purposes', { returnObjects: true });
                                            if (Array.isArray(purposes)) {
                                                return purposes.map((purpose, index) => (
                                                    <li key={index}>{purpose}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                    <p>{t('privacyPolicy.sections.cookies.note')}</p>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('privacyPolicy.sections.retention.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('privacyPolicy.sections.retention.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const policies = t('privacyPolicy.sections.retention.policies', { returnObjects: true });
                                            if (Array.isArray(policies)) {
                                                return policies.map((policy, index) => (
                                                    <li key={index}>{policy}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('privacyPolicy.sections.contact.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('privacyPolicy.sections.contact.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li dangerouslySetInnerHTML={{ __html: t('privacyPolicy.sections.contact.email') }}></li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('privacyPolicy.sections.updates.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('privacyPolicy.sections.updates.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const notifications = t('privacyPolicy.sections.updates.notifications', { returnObjects: true });
                                            if (Array.isArray(notifications)) {
                                                return notifications.map((notification, index) => (
                                                    <li key={index}>{notification}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                    <p>{t('privacyPolicy.sections.updates.acceptance')}</p>
                                </div>
                            </section>

                        </div>
                    </motion.div>
                </motion.div>
            </div>

            <ModernFooter />
        </div>
    );
};

export default PrivacyPolicy;
