import React from 'react';
import { motion } from 'framer-motion';
import { useI18nContext } from '@/contexts/I18nContext';
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import ModernFooter from '@/components/layout/ModernFooter';

/**
 * Cookie政策页面
 */
const CookiePolicy = () => {
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
                title={`${t('cookiePolicy.title')} - Dream Log`}
                description={t('cookiePolicy.description')}
                keywords={t('cookiePolicy.keywords')}
                path="/cookie-policy"
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
                            {t('cookiePolicy.title')}
                        </h1>
                        <p className="text-lg text-gray-300 dark:text-gray-300 light:text-gray-600">
                            {t('cookiePolicy.lastUpdated')}{new Date().getFullYear()}{t('common.date.year')}{new Date().getMonth() + 1}{t('common.date.month')}{new Date().getDate()}{t('common.date.day')}
                        </p>
                    </motion.div>

                    <motion.div variants={itemVariants} className="prose prose-lg prose-invert light:prose-gray max-w-none">
                        <div className="bg-slate-800/50 dark:bg-gray-900/50 light:bg-white/80 backdrop-blur-sm rounded-2xl p-8 space-y-6">

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('cookiePolicy.sections.whatAreCookies.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('cookiePolicy.sections.whatAreCookies.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const purposes = t('cookiePolicy.sections.whatAreCookies.purposes', { returnObjects: true });
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
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('cookiePolicy.sections.cookieTypes.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-2">{t('cookiePolicy.sections.cookieTypes.essential.title')}</h3>
                                        <p>{t('cookiePolicy.sections.cookieTypes.essential.description')}</p>
                                        <ul className="list-disc pl-6 space-y-1 mt-2">
                                            {(() => {
                                                const items = t('cookiePolicy.sections.cookieTypes.essential.items', { returnObjects: true });
                                                if (Array.isArray(items)) {
                                                    return items.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ));
                                                }
                                                return null;
                                            })()}
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-2">{t('cookiePolicy.sections.cookieTypes.functional.title')}</h3>
                                        <p>{t('cookiePolicy.sections.cookieTypes.functional.description')}</p>
                                        <ul className="list-disc pl-6 space-y-1 mt-2">
                                            {(() => {
                                                const items = t('cookiePolicy.sections.cookieTypes.functional.items', { returnObjects: true });
                                                if (Array.isArray(items)) {
                                                    return items.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ));
                                                }
                                                return null;
                                            })()}
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-2">{t('cookiePolicy.sections.cookieTypes.analytics.title')}</h3>
                                        <p>{t('cookiePolicy.sections.cookieTypes.analytics.description')}</p>
                                        <ul className="list-disc pl-6 space-y-1 mt-2">
                                            {(() => {
                                                const items = t('cookiePolicy.sections.cookieTypes.analytics.items', { returnObjects: true });
                                                if (Array.isArray(items)) {
                                                    return items.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ));
                                                }
                                                return null;
                                            })()}
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('cookiePolicy.sections.specificCookies.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700">
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border border-gray-600 dark:border-gray-700 light:border-gray-300">
                                            <thead>
                                                <tr className="bg-gray-700/50 dark:bg-gray-800/50 light:bg-gray-100">
                                                    <th className="border border-gray-600 dark:border-gray-700 light:border-gray-300 px-4 py-2 text-left">{t('cookiePolicy.sections.specificCookies.table.headers.name')}</th>
                                                    <th className="border border-gray-600 dark:border-gray-700 light:border-gray-300 px-4 py-2 text-left">{t('cookiePolicy.sections.specificCookies.table.headers.purpose')}</th>
                                                    <th className="border border-gray-600 dark:border-gray-700 light:border-gray-300 px-4 py-2 text-left">{t('cookiePolicy.sections.specificCookies.table.headers.duration')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const cookies = t('cookiePolicy.sections.specificCookies.table.cookies', { returnObjects: true });
                                                    if (Array.isArray(cookies)) {
                                                        return cookies.map((cookie, index) => (
                                                            <tr key={index} className={index % 2 === 1 ? "bg-gray-800/30 dark:bg-gray-900/30 light:bg-gray-50" : ""}>
                                                                <td className="border border-gray-600 dark:border-gray-700 light:border-gray-300 px-4 py-2">{cookie.name}</td>
                                                                <td className="border border-gray-600 dark:border-gray-700 light:border-gray-300 px-4 py-2">{cookie.purpose}</td>
                                                                <td className="border border-gray-600 dark:border-gray-700 light:border-gray-300 px-4 py-2">{cookie.duration}</td>
                                                            </tr>
                                                        ));
                                                    }
                                                    return null;
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('cookiePolicy.sections.thirdParty.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('cookiePolicy.sections.thirdParty.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const services = t('cookiePolicy.sections.thirdParty.services', { returnObjects: true });
                                            if (Array.isArray(services)) {
                                                return services.map((service, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: service }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                    <p>{t('cookiePolicy.sections.thirdParty.note')}</p>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('cookiePolicy.sections.management.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-2">{t('cookiePolicy.sections.management.browsers.title')}</h3>
                                        <p>{t('cookiePolicy.sections.management.browsers.description')}</p>
                                        <ul className="list-disc pl-6 space-y-1 mt-2">
                                            {(() => {
                                                const settings = t('cookiePolicy.sections.management.browsers.settings', { returnObjects: true });
                                                if (Array.isArray(settings)) {
                                                    return settings.map((setting, index) => (
                                                        <li key={index} dangerouslySetInnerHTML={{ __html: setting }}></li>
                                                    ));
                                                }
                                                return null;
                                            })()}
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-2">{t('cookiePolicy.sections.management.impacts.title')}</h3>
                                        <p>{t('cookiePolicy.sections.management.impacts.description')}</p>
                                        <ul className="list-disc pl-6 space-y-1 mt-2">
                                            {(() => {
                                                const items = t('cookiePolicy.sections.management.impacts.items', { returnObjects: true });
                                                if (Array.isArray(items)) {
                                                    return items.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ));
                                                }
                                                return null;
                                            })()}
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('cookiePolicy.sections.otherTech.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('cookiePolicy.sections.otherTech.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const technologies = t('cookiePolicy.sections.otherTech.technologies', { returnObjects: true });
                                            if (Array.isArray(technologies)) {
                                                return technologies.map((tech, index) => (
                                                    <li key={index} dangerouslySetInnerHTML={{ __html: tech }}></li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('cookiePolicy.sections.dataProtection.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('cookiePolicy.sections.dataProtection.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const measures = t('cookiePolicy.sections.dataProtection.measures', { returnObjects: true });
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
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('cookiePolicy.sections.updates.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('cookiePolicy.sections.updates.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        {(() => {
                                            const reasons = t('cookiePolicy.sections.updates.reasons', { returnObjects: true });
                                            if (Array.isArray(reasons)) {
                                                return reasons.map((reason, index) => (
                                                    <li key={index}>{reason}</li>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </ul>
                                    <p>{t('cookiePolicy.sections.updates.notification')}</p>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900 mb-4">{t('cookiePolicy.sections.contact.title')}</h2>
                                <div className="text-gray-300 dark:text-gray-300 light:text-gray-700 space-y-3">
                                    <p>{t('cookiePolicy.sections.contact.content')}</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li dangerouslySetInnerHTML={{ __html: t('cookiePolicy.sections.contact.email') }}></li>
                                    </ul>
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

export default CookiePolicy;
