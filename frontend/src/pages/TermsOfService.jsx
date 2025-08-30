import React from 'react';
import { motion } from 'framer-motion';
import { useI18nContext } from '@/contexts/I18nContext';
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import ModernFooter from '@/components/layout/ModernFooter';

/**
 * 服务条款页面
 */
const TermsOfService = () => {
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
                title={`${t('termsOfService.title')} - Dream Log`}
                description={t('termsOfService.description')}
                keywords={t('termsOfService.keywords')}
                path="/terms-of-service"
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
                            {t('termsOfService.title')}
                        </h1>
                        <p className="text-lg text-gray-300 dark:text-gray-300 light:text-gray-600">
                            {t('termsOfService.lastUpdated')}{new Date().getFullYear()}{t('common.date.year')}{new Date().getMonth() + 1}{t('common.date.month')}{new Date().getDate()}{t('common.date.day')}
                        </p>
                    </motion.div>

                    <motion.div variants={itemVariants} className="prose prose-lg prose-invert light:prose-gray max-w-none">
                        <div className="bg-slate-800/50 dark:bg-gray-900/50 light:bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-6">

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('termsOfService.sections.serviceIntro.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('termsOfService.sections.serviceIntro.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const services = t('termsOfService.sections.serviceIntro.services', { returnObjects: true });
                                            if (Array.isArray(services)) {
                                                return services.map((service, index) => (
                                                    <li key={index}>{service}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('termsOfService.sections.userResponsibilities.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('termsOfService.sections.userResponsibilities.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const responsibilities = t('termsOfService.sections.userResponsibilities.responsibilities', { returnObjects: true });
                                            if (Array.isArray(responsibilities)) {
                                                return responsibilities.map((responsibility, index) => (
                                                    <li key={index}>{responsibility}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('termsOfService.sections.serviceRules.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('termsOfService.sections.serviceRules.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const rules = t('termsOfService.sections.serviceRules.rules', { returnObjects: true });
                                            if (Array.isArray(rules)) {
                                                return rules.map((rule, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: rule }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('termsOfService.sections.intellectualProperty.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('termsOfService.sections.intellectualProperty.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const provisions = t('termsOfService.sections.intellectualProperty.provisions', { returnObjects: true });
                                            if (Array.isArray(provisions)) {
                                                return provisions.map((provision, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: provision }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('termsOfService.sections.disclaimer.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('termsOfService.sections.disclaimer.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const disclaimers = t('termsOfService.sections.disclaimer.disclaimers', { returnObjects: true });
                                            if (Array.isArray(disclaimers)) {
                                                return disclaimers.map((disclaimer, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: disclaimer }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('termsOfService.sections.changesAndTermination.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('termsOfService.sections.changesAndTermination.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const policies = t('termsOfService.sections.changesAndTermination.policies', { returnObjects: true });
                                            if (Array.isArray(policies)) {
                                                return policies.map((policy, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: policy }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('termsOfService.sections.disputeResolution.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('termsOfService.sections.disputeResolution.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const suggestions = t('termsOfService.sections.disputeResolution.suggestions', { returnObjects: true });
                                            if (Array.isArray(suggestions)) {
                                                return suggestions.map((suggestion, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: suggestion }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('termsOfService.sections.applicableLaw.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('termsOfService.sections.applicableLaw.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const laws = t('termsOfService.sections.applicableLaw.laws', { returnObjects: true });
                                            if (Array.isArray(laws)) {
                                                return laws.map((law, index) => (
                                                    <li key={index}>{law}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('termsOfService.sections.contact.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('termsOfService.sections.contact.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li dangerouslySetInnerHTML={{ __html: t('termsOfService.sections.contact.email') }}></li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('termsOfService.sections.effectiveness.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('termsOfService.sections.effectiveness.content').replace('{year}', new Date().getFullYear()).replace('{month}', new Date().getMonth() + 1).replace('{day}', new Date().getDate())}</p>
                                    <p>{t('termsOfService.sections.effectiveness.updates')}</p>
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

export default TermsOfService;
