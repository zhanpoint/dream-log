import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Heart, Users, MapPin, Package, Activity, Cloud } from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';

const TagLeaderboard = ({ data = {} }) => {
    const { t } = useI18nContext();
    const tagTypeConfig = {
        emotion: { label: t('statistics.tags.emotion', '情感'), icon: Heart, color: 'from-red-500 to-rose-600' },
        character: { label: t('statistics.tags.character', '角色'), icon: Users, color: 'from-blue-500 to-indigo-600' },
        location: { label: t('statistics.tags.location', '地点'), icon: MapPin, color: 'from-green-500 to-emerald-600' },
        object: { label: t('statistics.tags.object', '物体'), icon: Package, color: 'from-yellow-500 to-amber-600' },
        action: { label: t('statistics.tags.action', '行为'), icon: Activity, color: 'from-purple-500 to-violet-600' },
        weather: { label: t('statistics.tags.weather', '天气'), icon: Cloud, color: 'from-cyan-500 to-sky-600' },
    };

    // 获取有数据的标签类型
    const availableTypes = Object.keys(data).filter(
        (type) => data[type] && data[type].length > 0
    );

    const [activeType, setActiveType] = useState(availableTypes[0] || '');

    if (availableTypes.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4 text-cyan-500" />
                        {t('statistics.tagLeaderboard', '标签排行榜')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                        <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">{t('statistics.noTagData', '暂无标签数据')}</p>
                        <p className="text-xs mt-1">{t('statistics.recordMoreForAnalysis', '记录更多梦境后查看分析')}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const contentVariants = {
        hidden: {
            opacity: 0,
        },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.2,
                ease: 'easeOut',
            },
        },
        exit: {
            opacity: 0,
            transition: {
                duration: 0.15,
            },
        },
    };

    return (
        <Card className="h-full theme-transition">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-cyan-500" />
                    {t('statistics.tagLeaderboard', '标签排行榜')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* 自定义标签切换 */}
                <div className="grid w-full mb-6" style={{
                    gridTemplateColumns: `repeat(${Math.min(availableTypes.length, 4)}, 1fr)`,
                    gap: '8px',
                }}>
                    {availableTypes.map((type) => {
                        const config = tagTypeConfig[type];
                        if (!config) return null;
                        const Icon = config.icon;
                        const isActive = activeType === type;

                        return (
                            <button
                                key={type}
                                onClick={() => setActiveType(type)}
                                className={`
                                    flex items-center justify-center gap-2 p-3 rounded-lg
                                    border transition-all duration-200 relative
                                    ${isActive
                                        ? `border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-md
                                           before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r 
                                           before:from-cyan-500/20 before:to-cyan-600/20 before:opacity-100`
                                        : 'border-input bg-background text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent/50'
                                    }
                                `}
                            >
                                <Icon className={`h-4 w-4 z-10 relative ${isActive ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
                                <span className={`text-sm font-medium z-10 relative ${isActive ? 'font-semibold' : ''}`}>
                                    {config.label}
                                </span>
                                {isActive && (
                                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-cyan-500 rounded-full"></div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 内容区域 */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeType}
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="space-y-3"
                    >
                        {data[activeType]?.length > 0 ? (
                            data[activeType].map((tag, index) => (
                                <div
                                    key={`${tag.name}-${index}`}
                                    className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors duration-150"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`
                                            flex items-center justify-center 
                                            w-8 h-8 rounded-full text-white font-bold text-sm
                                            ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                                                index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                                                    index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                                                        'bg-muted-foreground/50'}
                                        `}>
                                            {index + 1}
                                        </span>
                                        <span className="font-medium">{tag.name}</span>
                                    </div>
                                    <Badge variant="secondary" className="ml-2">
                                        {tag.count} {t('statistics.times', '次')}
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center py-4">
                                {t('statistics.noData', '暂无数据')}
                            </p>
                        )}
                    </motion.div>
                </AnimatePresence>
            </CardContent>
        </Card>
    );
};

export default TagLeaderboard;
