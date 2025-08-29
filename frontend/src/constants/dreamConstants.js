// 梦境分类配置
export const DREAM_CATEGORIES = [
    { value: 'normal', label: '普通梦境', color: '#6366f1' },
    { value: 'lucid', label: '清醒梦', color: '#8b5cf6' },
    { value: 'nightmare', label: '噩梦', color: '#ef4444' },
    { value: 'recurring', label: '重复梦', color: '#f59e0b' },
    { value: 'prophetic', label: '预知梦', color: '#10b981' },
    { value: 'healing', label: '治愈梦', color: '#06b6d4' },
    { value: 'spiritual', label: '灵性梦境', color: '#ec4899' },
    { value: 'creative', label: '创意梦境', color: '#f97316' },
    { value: 'hypnagogic', label: '入睡幻觉', color: '#d946ef' },
    { value: 'hypnopompic', label: '醒前幻觉', color: '#84cc16' },
    { value: 'sleep_paralysis', label: '睡眠瘫痪', color: '#78716c' },
    { value: 'false_awakening', label: '假醒', color: '#fbbf24' },
    { value: 'anxiety', label: '焦虑梦', color: '#f87171' },
    { value: 'joyful', label: '快乐梦境', color: '#facc15' },
    { value: 'melancholic', label: '忧郁梦境', color: '#60a5fa' },
    { value: 'adventure', label: '冒险梦境', color: '#fb923c' },
];

export const getCategoryConfig = (t) => ({
    normal: { label: t('dreams:categories.normal', '普通梦境'), color: '#6366f1' },
    lucid: { label: t('dreams:categories.lucid', '清醒梦'), color: '#8b5cf6' },
    nightmare: { label: t('dreams:categories.nightmare', '噩梦'), color: '#ef4444' },
    recurring: { label: t('dreams:categories.recurring', '重复梦'), color: '#f59e0b' },
    prophetic: { label: t('dreams:categories.prophetic', '预知梦'), color: '#10b981' },
    healing: { label: t('dreams:categories.healing', '治愈梦'), color: '#06b6d4' },
    spiritual: { label: t('dreams:categories.spiritual', '灵性梦境'), color: '#ec4899' },
    creative: { label: t('dreams:categories.creative', '创意梦境'), color: '#f97316' },
    hypnagogic: { label: t('dreams:categories.hypnagogic', '入睡幻觉'), color: '#d946ef' },
    hypnopompic: { label: t('dreams:categories.hypnopompic', '醒前幻觉'), color: '#84cc16' },
    sleep_paralysis: { label: t('dreams:categories.sleep_paralysis', '睡眠瘫痪'), color: '#78716c' },
    false_awakening: { label: t('dreams:categories.false_awakening', '假醒'), color: '#fbbf24' },
    anxiety: { label: t('dreams:categories.anxiety', '焦虑梦'), color: '#f87171' },
    joyful: { label: t('dreams:categories.joyful', '快乐梦境'), color: '#facc15' },
    melancholic: { label: t('dreams:categories.melancholic', '忧郁梦境'), color: '#60a5fa' },
    adventure: { label: t('dreams:categories.adventure', '冒险梦境'), color: '#fb923c' },
});

// 情绪配置
export const MOOD_OPTIONS = [
    { value: 'very_negative', label: '非常消极', color: '#ef4444' },
    { value: 'negative', label: '消极', color: '#f59e0b' },
    { value: 'neutral', label: '中性', color: '#6b7280' },
    { value: 'positive', label: '积极', color: '#10b981' },
    { value: 'very_positive', label: '非常积极', color: '#06b6d4' },
];

export const getMoodConfig = (t) => ({
    very_negative: { label: t('dreams:moods.very_negative', '非常消极'), color: '#ef4444' },
    negative: { label: t('dreams:moods.negative', '消极'), color: '#f59e0b' },
    neutral: { label: t('dreams:moods.neutral', '中性'), color: '#6b7280' },
    positive: { label: t('dreams:moods.positive', '积极'), color: '#10b981' },
    very_positive: { label: t('dreams:moods.very_positive', '非常积极'), color: '#06b6d4' },
});

// 睡眠质量配置
export const SLEEP_QUALITY_OPTIONS = [
    { value: 1, label: '很差', color: '#ef4444' },
    { value: 2, label: '较差', color: '#f59e0b' },
    { value: 3, label: '一般', color: '#6b7280' },
    { value: 4, label: '良好', color: '#10b981' },
    { value: 5, label: '很好', color: '#06b6d4' },
];

export const getSleepQualityConfig = (t) => ({
    1: { label: t('dreams:sleepQuality.very_poor', '很差'), color: '#ef4444' },
    2: { label: t('dreams:sleepQuality.poor', '较差'), color: '#f59e0b' },
    3: { label: t('dreams:sleepQuality.average', '一般'), color: '#6b7280' },
    4: { label: t('dreams:sleepQuality.good', '良好'), color: '#10b981' },
    5: { label: t('dreams:sleepQuality.excellent', '很好'), color: '#06b6d4' },
});

// 隐私设置配置
export const PRIVACY_OPTIONS = [
    { value: 'private', label: '私人', icon: 'Shield', color: '#6b7280' },
    { value: 'public', label: '公开', icon: 'Globe', color: '#10b981' },
    { value: 'friends', label: '好友可见', icon: 'Users', color: '#3b82f6' },
];

export const getPrivacyConfig = (t) => ({
    private: { label: t('dreams:privacy.private', '私人'), icon: 'Shield', color: '#6b7280' },
    public: { label: t('dreams:privacy.public', '公开'), icon: 'Globe', color: '#10b981' },
    friends: { label: t('dreams:privacy.friends', '好友可见'), icon: 'Users', color: '#3b82f6' },
});

// 标签类型配置
export const TAG_TYPES = [
    { value: 'emotion', label: '情感' },
    { value: 'character', label: '角色' },
    { value: 'location', label: '地点' },
    { value: 'object', label: '物体' },
    { value: 'action', label: '行为' },
    { value: 'weather', label: '天气' },
];