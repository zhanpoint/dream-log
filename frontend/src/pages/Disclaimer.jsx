import React from 'react';
import { motion } from 'framer-motion';
import { useI18nContext } from '@/contexts/I18nContext';
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import ModernFooter from '@/components/layout/ModernFooter';

/**
 * 免责声明页面
 */
const Disclaimer = () => {
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
                title={`${t('disclaimer.title')} - Dream Log`}
                description={t('disclaimer.description')}
                keywords={t('disclaimer.keywords')}
                path="/disclaimer"
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
                            {t('disclaimer.title')}
                        </h1>
                        <p className="text-lg text-gray-300 dark:text-gray-300 light:text-gray-600">
                            {t('disclaimer.lastUpdated')}{new Date().getFullYear()}{t('common.date.year')}{new Date().getMonth() + 1}{t('common.date.month')}{new Date().getDate()}{t('common.date.day')}
                        </p>
                    </motion.div>

                    <motion.div variants={itemVariants} className="prose prose-lg prose-invert light:prose-gray max-w-none">
                        <div className="bg-slate-800/50 dark:bg-gray-900/50 light:bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-6">

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('disclaimer.sections.serviceNature.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('disclaimer.sections.serviceNature.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const points = t('disclaimer.sections.serviceNature.points', { returnObjects: true });
                                            if (Array.isArray(points)) {
                                                return points.map((point, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: point }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('disclaimer.sections.contentAccuracy.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('disclaimer.sections.contentAccuracy.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const points = t('disclaimer.sections.contentAccuracy.points', { returnObjects: true });
                                            if (Array.isArray(points)) {
                                                return points.map((point, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: point }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('disclaimer.sections.healthDisclaimer.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('disclaimer.sections.healthDisclaimer.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const conditions = t('disclaimer.sections.healthDisclaimer.conditions', { returnObjects: true });
                                            if (Array.isArray(conditions)) {
                                                return conditions.map((condition, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: condition }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                    <p className="text-yellow-400 dark:text-yellow-400 light:text-orange-600 font-semibold">
                                        {t('disclaimer.sections.healthDisclaimer.warning')}
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('disclaimer.sections.technicalDisclaimer.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('disclaimer.sections.technicalDisclaimer.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const points = t('disclaimer.sections.technicalDisclaimer.points', { returnObjects: true });
                                            if (Array.isArray(points)) {
                                                return points.map((point, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: point }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('disclaimer.sections.userBehavior.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('disclaimer.sections.userBehavior.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const points = t('disclaimer.sections.userBehavior.points', { returnObjects: true });
                                            if (Array.isArray(points)) {
                                                return points.map((point, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: point }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('disclaimer.sections.thirdPartyContent.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('disclaimer.sections.thirdPartyContent.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const points = t('disclaimer.sections.thirdPartyContent.points', { returnObjects: true });
                                            if (Array.isArray(points)) {
                                                return points.map((point, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: point }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('disclaimer.sections.lossesAndDamages.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('disclaimer.sections.lossesAndDamages.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const losses = t('disclaimer.sections.lossesAndDamages.losses', { returnObjects: true });
                                            if (Array.isArray(losses)) {
                                                return losses.map((loss, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: loss }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('disclaimer.sections.applicableLaw.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('disclaimer.sections.applicableLaw.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const points = t('disclaimer.sections.applicableLaw.points', { returnObjects: true });
                                            if (Array.isArray(points)) {
                                                return points.map((point, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: point }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('disclaimer.sections.userConfirmation.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('disclaimer.sections.userConfirmation.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const confirmations = t('disclaimer.sections.userConfirmation.confirmations', { returnObjects: true });
                                            if (Array.isArray(confirmations)) {
                                                return confirmations.map((confirmation, index) => (
                                                    <li key={index}>{confirmation}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('disclaimer.sections.contact.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('disclaimer.sections.contact.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li dangerouslySetInnerHTML={{ __html: t('disclaimer.sections.contact.email') }}></li>
                                    </ul>
                                    <p className="mt-4 text-sm text-gray-400 dark:text-gray-400 light:text-gray-600">
                                        {t('disclaimer.sections.contact.note')}
                                    </p>
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

export default Disclaimer;
