import React, { useState, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Hash, Lock, Moon, Sun, Cloud, Clock, Bed, Star,
  FileText, NotebookPen, BookOpen, Globe, Heart, Brain, Palette, Text, X, Info
} from 'lucide-react';
import { useI18nContext } from '@/contexts/I18nContext';
import { MultilingualSeo } from '@/components/seo/MultilingualSeo';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import AiTitleGenerator from '@/components/ui/ai-title-generator';
const TiptapEditor = React.lazy(() => import('@/components/ui/tiptap-editor'));
import '@/components/ui/css/tiptap-editor.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { EnhancedResizableTextarea } from '@/components/ui/enhanced-resizable-textarea';
import { Badge } from '@/components/ui/badge';
import RecurringDreamField from '@/components/ui/recurring-dream-field';

import { DREAM_CATEGORIES, MOOD_OPTIONS, SLEEP_QUALITY_OPTIONS, PRIVACY_OPTIONS, TAG_TYPES } from '@/constants/dreamConstants';
import notification from '@/utils/notification';
import api from '@/services/api';
import { uploadImage, markImagesForDeletion } from '@/services/oss';
import { useImageUndoRedo } from '@/hooks/useUndoRedo';
import { cn } from '@/lib/utils';
import './css/CreateDream.css';

const CreateDream = () => {
  const { t, i18n, forceUpdateKey } = useI18nContext();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [newTagType, setNewTagType] = useState('character');

  // 图片删除撤销重做管理
  const imageUndoRedo = useImageUndoRedo();

  // 自定义图片上传处理器
  const handleImageUpload = async (file, onProgress = null) => {
    try {
      // uploadImage 现在支持进度回调
      const result = await uploadImage(file, onProgress);
      if (result && result.url) {
        // 确保返回的是可公开访问的URL
        return result.url;
      }
      notification.error(t('dreams:create.imageUploadNoUrl', '图片上传成功，但无法获取URL'));
      return null; // 返回null表示失败
    } catch (error) {
      notification.error(t('dreams:create.imageUploadFailed', '图片上传失败'));
      console.error("Upload failed:", error);
      // 抛出错误或返回null，让调用者知道失败了
      return null;
    }
  };

  // 新增: 处理图片删除
  const handleImageDeleted = (imageUrl) => {
    console.log('CreateDream: 处理图片删除:', imageUrl);
    imageUndoRedo.addImageToDeleteList(imageUrl);
  };

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    dream_date: new Date().toISOString().split('T')[0],
    categories: [],
    tags: [],
    lucidity_level: 0,
    mood_before_sleep: '',
    mood_in_dream: '',
    mood_after_waking: '',
    privacy: 'private',
    is_favorite: false,

    personal_notes: '',
    sleep_quality: '',
    sleep_duration: '',
    bedtime: '',
    wake_time: '',
    is_recurring: false,
    recurring_elements: '',
    vividness: 3,
  });

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = t('common.validation.required', '此字段为必填项');
    }

    if (!formData.content.trim()) {
      errors.content = t('common.validation.required', '此字段为必填项');
    }

    if (!formData.dream_date) {
      errors.dream_date = t('common.validation.required', '此字段为必填项');
    } else if (new Date(formData.dream_date) > new Date()) {
      errors.dream_date = t('common.validation.dateNotFuture', '日期不能是未来日期');
    }



    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // 清除验证错误
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const toggleCategory = (category) => {
    const newCategories = formData.categories.includes(category)
      ? formData.categories.filter(c => c !== category)
      : [...formData.categories, category];

    handleFieldChange('categories', newCategories);
  };

  const addTag = () => {
    if (!newTag.trim()) {
      notification.error(t('dreams:create.tagNameRequired', '标签名称不能为空'));
      return;
    }

    const trimmedTag = newTag.trim();

    if (formData.tags.some(tag => tag.name === trimmedTag)) {
      notification.error(t('dreams:create.tagExists', '标签已存在'));
      return;
    }

    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, { name: trimmedTag, tag_type: newTagType }]
    }));
    setNewTag('');
  };

  const removeTag = (tagName) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag.name !== tagName)
    }));
  };

  const handleDurationChange = (value) => {
    if (value === '' || value === null || value === undefined) {
      handleFieldChange('sleep_duration', '');
    } else {
      const hours = parseFloat(value);
      if (!isNaN(hours) && hours >= 0 && hours <= 24) {
        // 限制为小数点后一位
        const formattedValue = parseFloat(hours.toFixed(1));
        handleFieldChange('sleep_duration', formattedValue.toString());
      }
    }
  };

  const getDurationHours = () => {
    return formData.sleep_duration || '';
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      notification.error(t('common.error.fixFormErrors', '请修正表单中的错误'));
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        categories: formData.categories,
        tags: formData.tags,
        sleep_quality: formData.sleep_quality ? parseInt(formData.sleep_quality) : null,
        sleep_duration: formData.sleep_duration ? Math.round(parseFloat(formData.sleep_duration) * 3600) : null,
        vividness: parseInt(formData.vividness),
      };

      const response = await api.post('/dreams/', submitData);

      if (response.data) {
        // 处理待删除的图片
        if (imageUndoRedo.pendingDeletes.length > 0) {
          try {
            await markImagesForDeletion(imageUndoRedo.pendingDeletes);
            console.log(`已标记 ${imageUndoRedo.pendingDeletes.length} 张图片待删除`);
          } catch (error) {
            console.warn('标记待删除图片时出错:', error);
            // 不阻止梦境创建成功的流程
          }
        }

        notification.success(t('common.success.created', '创建成功'));
        navigate(`/dreams/${response.data.id}`);
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
        notification.error(t('common.error.fixFormErrors', '请修正表单中的错误'));
      } else {
        notification.error(t('dreams:create.failed', '创建失败') + ': ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // i18n: 使用 forceUpdateKey 确保语言切换时重新渲染，修复命名空间错误
  const i18nCategories = useMemo(() => {
    return DREAM_CATEGORIES.map((c) => ({
      ...c,
      i18nLabel: t(`dreams:categories.${c.value}`, c.label),
      // 若当前语言缺少对应描述，则仅在简体中文下回退至常量描述，其他语言为空
      i18nDescription: t(`dreams:categoryDescriptions.${c.value}`, i18n.language === 'zh-CN' ? c.description : '')
    }));
  }, [forceUpdateKey]);

  const i18nMoods = useMemo(() => {
    return MOOD_OPTIONS.map((m) => ({
      ...m,
      i18nLabel: t(`dreams:moods.${m.value}`, m.label)
    }));
  }, [forceUpdateKey]);

  const i18nSleepQualities = useMemo(() => {
    const mapKey = { 1: 'very_poor', 2: 'poor', 3: 'average', 4: 'good', 5: 'excellent' };
    return SLEEP_QUALITY_OPTIONS.map((q) => ({
      ...q,
      i18nLabel: t(`dreams:sleepQuality.${mapKey[q.value]}`, q.label)
    }));
  }, [forceUpdateKey]);

  const i18nPrivacyOptions = useMemo(() => {
    return PRIVACY_OPTIONS.map((p) => ({
      ...p,
      i18nLabel: t(`dreams:privacy.${p.value}`, p.label)
    }));
  }, [forceUpdateKey]);

  const getTagTypeLabel = (typeValue) => {
    const fallback = TAG_TYPES.find((x) => x.value === typeValue)?.label || typeValue;
    return t(`dreams:tagTypes.${typeValue}`, fallback);
  };

  return (
    <>
      <MultilingualSeo
        title={t('dreams:create.pageTitle', '创建梦境')}
        description={t('dreams:create.pageDescription', '记录你的梦境世界')}
        keywords={t('dreams:create.pageKeywords', '梦境,记录,创建,分析')}
      />
      <div className="create-dream-container">
        <div className="create-dream-header animate-fade-in">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="back-button hover:scale-110 transition-transform duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="create-dream-title">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="dreamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899">
                    <animate attributeName="stop-color"
                      values="#ec4899;#f59e0b;#10b981;#3b82f6;#8b5cf6;#ec4899"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                  <stop offset="20%" stopColor="#f472b6">
                    <animate attributeName="stop-color"
                      values="#f472b6;#fbbf24;#34d399;#60a5fa;#a855f7;#f472b6"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                  <stop offset="40%" stopColor="#a855f7">
                    <animate attributeName="stop-color"
                      values="#a855f7;#ec4899;#f59e0b;#10b981;#3b82f6;#a855f7"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                  <stop offset="60%" stopColor="#3b82f6">
                    <animate attributeName="stop-color"
                      values="#3b82f6;#8b5cf6;#ec4899;#f59e0b;#10b981;#3b82f6"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                  <stop offset="80%" stopColor="#10b981">
                    <animate attributeName="stop-color"
                      values="#10b981;#3b82f6;#8b5cf6;#ec4899;#f59e0b;#10b981"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#f59e0b">
                    <animate attributeName="stop-color"
                      values="#f59e0b;#10b981;#3b82f6;#8b5cf6;#ec4899;#f59e0b"
                      dur="3s"
                      repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              </defs>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            {t('dreams:create.title', '记录梦境')}
          </h1>
        </div>

        <Card className="create-dream-card animate-slide-up backdrop-blur-md bg-background/80">
          <CardHeader>
            <CardTitle className="text-center">
              <div className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent text-2xl font-bold">
                {t('dreams:create.subtitle', '创建你的梦境世界')}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="section-title">
                <FileText className="w-5 h-5 mr-2" />
                {t('dreams:create.form.basicInfo', '基础信息')}
              </h3>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label htmlFor="title" className="enhanced-label">
                    <Text className="w-4 h-4" />
                    {t('dreams:create.form.dreamTitle', '梦境标题')}
                    <span className="required-star">*</span>
                  </Label>
                  <div className="relative flex items-center gap-2">
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      className={cn(
                        'enhanced-input transition-all duration-300 pr-32', // 增加右侧内边距，为按钮和计数器留出空间
                        validationErrors.title ? 'border-red-500' : ''
                      )}
                      maxLength={30} // 限制标题最多30个字符
                      placeholder={t('dreams:create.form.dreamTitlePlaceholder', '给你的梦境起个名字...')}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-xs text-primary font-medium">
                        {formData.title.length}/30
                      </span>
                      <AiTitleGenerator
                        dreamContent={formData.content}
                        onTitleGenerated={(title) => handleFieldChange('title', title)}
                        className="shrink-0"
                      />
                    </div>
                  </div>
                </div>
                {validationErrors.title && (
                  <p className="text-red-500 text-sm mt-1 animate-fade-in">{validationErrors.title}</p>
                )}
              </div>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label htmlFor="dream_date" className="enhanced-label">
                    <Calendar className="w-4 h-4" />
                    {t('dreams:create.form.dreamDate', '梦境日期')}
                    <span className="required-star">*</span>
                  </Label>
                  <Input
                    id="dream_date"
                    type="date"
                    value={formData.dream_date}
                    onChange={(e) => handleFieldChange('dream_date', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={`enhanced-input transition-all duration-300 ${validationErrors.dream_date ? 'border-red-500' : ''}`}
                  />
                </div>
                {validationErrors.dream_date && (
                  <p className="text-red-500 text-sm mt-1 animate-fade-in">{validationErrors.dream_date}</p>
                )}
              </div>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label className="enhanced-label">
                    <BookOpen className="w-4 h-4" />
                    {t('dreams:create.form.content', '梦境内容')}
                    <span className="required-star">*</span>
                  </Label>

                  <Suspense fallback={<div className="tiptap-loading">{t('common:editor.loading', '编辑器加载中...')}</div>}>
                    <TiptapEditor
                      content={formData.content}
                      onChange={(value) => handleFieldChange('content', value || '')}
                      placeholder={t('dreams:create.form.contentPlaceholder', '开始记录你的梦境...')}
                      onImageUpload={handleImageUpload}
                      onImageDeleted={handleImageDeleted}
                      className={`transition-all duration-300 ${validationErrors.content ? 'border-red-500' : ''}`}
                    />
                  </Suspense>
                </div>
                {validationErrors.content && (
                  <p className="text-red-500 text-sm mt-1 animate-fade-in">{validationErrors.content}</p>
                )}
              </div>


            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="section-title">
                <Palette className="w-5 h-5 mr-2" />
                {t('dreams:create.form.categories', '分类')}
              </h3>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label className="enhanced-label">
                    <Star className="w-4 h-4" />
                    {t('dreams:create.form.categories', '分类')} <span className="optional-text">({t('common.optional', '可选')})</span>
                    <HoverCard>
                      <HoverCardTrigger>
                        <Info className="w-4 h-4 ml-1 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                      </HoverCardTrigger>
                      <HoverCardContent className="w-96 max-h-96 bg-popover/95 backdrop-blur-md border border-border text-popover-foreground shadow-xl">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-primary">{t('dreams:create.form.categoryHelp.title', '梦境类别说明')}</h4>
                          <p className="text-xs text-muted-foreground">{t('dreams:create.form.categoryHelp.description', '选择最符合你梦境特点的类别：')}</p>
                          <div className="max-h-60 overflow-y-auto pr-2">
                            {i18nCategories.map(category => (
                              <div key={category.value} className="mb-2 last:mb-0">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }}></div>
                                  <span className="text-xs font-medium" style={{ color: category.color }}>{category.i18nLabel}</span>
                                </div>
                                {category.i18nDescription && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{category.i18nDescription}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </Label>
                  <div className="categories-grid">
                    {i18nCategories.map(category => (
                      <Badge
                        key={category.value}
                        variant={formData.categories.includes(category.value) ? "default" : "outline"}
                        className="category-badge cursor-pointer transition-all duration-300 hover:scale-105"
                        style={{
                          backgroundColor: formData.categories.includes(category.value) ? category.color : 'transparent',
                          borderColor: category.color,
                          color: formData.categories.includes(category.value) ? 'white' : category.color
                        }}
                        onClick={() => toggleCategory(category.value)}
                      >
                        {category.i18nLabel}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label className="enhanced-label">
                    <Hash className="w-4 h-4" />
                    {t('dreams:create.form.tags', '标签')} <span className="optional-text">({t('common.optional', '可选')})</span>
                  </Label>
                  <div className="tags-input-wrapper">
                    <Select value={newTagType} onValueChange={setNewTagType}>
                      <SelectTrigger className="tag-type-select enhanced-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAG_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {getTagTypeLabel(type.value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder={t('dreams:create.form.tagPlaceholder', '添加标签...')}
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="tag-input enhanced-input transition-all duration-300"
                      maxLength={50}
                    />
                    <Button onClick={addTag} size="sm" className="tag-add-button">
                      {t('common.add', '添加')}
                    </Button>
                  </div>
                  <div className="tags-list">
                    {formData.tags.map((tag, index) => (
                      <div
                        key={`${tag.name}-${index}`}
                        className="tag-badge animate-fade-in"
                      >
                        <span className="tag-type">{getTagTypeLabel(tag.tag_type)}:</span>
                        <span className="tag-name">{tag.name}</span>
                        <span
                          onClick={() => removeTag(tag.name)}
                          className="tag-remove"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              removeTag(tag.name);
                            }
                          }}
                        >
                          <X className="w-3 h-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <h3 className="section-title">
                <Brain className="w-5 h-5 mr-2" />
                {t('dreams:create.form.characteristics', '梦境特征')}
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Moon className="w-4 h-4" />
                      {t('dreams:create.form.lucidity', '清醒度')} <span className="optional-text">({t('common.optional', '可选')})</span>: {formData.lucidity_level}
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Info className="w-4 h-4 ml-1 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-96 max-h-96 bg-popover/95 backdrop-blur-md border border-border text-popover-foreground shadow-xl">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-primary">{t('dreams:create.form.lucidityHelp.title', '清醒度等级说明')}</h4>
                            <p className="text-xs text-muted-foreground">
                              {t('dreams:create.form.lucidityHelp.description', '清醒度等级是指在梦境中对自己正在做梦这一事实的意识程度。')}
                            </p>
                            <div className="space-y-1 text-xs">
                              <div><span className="font-medium">{t('dreams:create.form.lucidityHelp.level0', '0级 - 完全无意识：')}</span> {t('dreams:create.form.lucidityHelp.level0Desc', '完全不知道自己在做梦，梦境体验如同现实')}</div>
                              <div><span className="font-medium">{t('dreams:create.form.lucidityHelp.level1', '1级 - 微弱意识：')}</span> {t('dreams:create.form.lucidityHelp.level1Desc', '偶尔怀疑现实，但很快被梦境逻辑说服')}</div>
                              <div><span className="font-medium">{t('dreams:create.form.lucidityHelp.level2', '2级 - 模糊意识：')}</span> {t('dreams:create.form.lucidityHelp.level2Desc', '隐约感觉不对劲，但无法确定是在做梦')}</div>
                              <div><span className="font-medium">{t('dreams:create.form.lucidityHelp.level3', '3级 - 部分清醒：')}</span> {t('dreams:create.form.lucidityHelp.level3Desc', '意识到在做梦，但控制能力有限')}</div>
                              <div><span className="font-medium">{t('dreams:create.form.lucidityHelp.level4', '4级 - 高度清醒：')}</span> {t('dreams:create.form.lucidityHelp.level4Desc', '完全知道在做梦，能够进行一定程度的控制')}</div>
                              <div><span className="font-medium">{t('dreams:create.form.lucidityHelp.level5', '5级 - 超清醒状态：')}</span> {t('dreams:create.form.lucidityHelp.level5Desc', '完全清醒，能够自由控制梦境内容和情节')}</div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </Label>
                    <Slider
                      value={[formData.lucidity_level]}
                      onValueChange={(value) => handleFieldChange('lucidity_level', value[0])}
                      min={0}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <div className="lucidity-labels">
                      <span>{t('dreams:create.form.lucidityLabels.min', '完全无意识')}</span>
                      <span>{t('dreams:create.form.lucidityLabels.max', '超清醒状态')}</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Sun className="w-4 h-4" />
                      {t('dreams:create.form.vividness', '清晰度')} <span className="optional-text">({t('common.optional', '可选')})</span>: {formData.vividness}
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Info className="w-4 h-4 ml-1 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-96 max-h-96 bg-popover/95 backdrop-blur-md border border-border text-popover-foreground shadow-xl">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-primary">{t('dreams:create.form.vividnessHelp.title', '清晰度说明')}</h4>
                            <p className="text-xs text-muted-foreground">
                              {t('dreams:create.form.vividnessHelp.description', '清晰度是指梦境中感官体验的生动程度和细节丰富度。')}
                            </p>
                            <div className="space-y-1 text-xs">
                              <div><span className="font-medium">{t('dreams:create.form.vividnessHelp.level1', '1级 - 模糊：')}</span> {t('dreams:create.form.vividnessHelp.level1Desc', '梦境朦胧不清，细节缺失，如同雾中看花')}</div>
                              <div><span className="font-medium">{t('dreams:create.form.vividnessHelp.level2', '2级 - 较模糊：')}</span> {t('dreams:create.form.vividnessHelp.level2Desc', '能看清大致轮廓，但细节不够清晰')}</div>
                              <div><span className="font-medium">{t('dreams:create.form.vividnessHelp.level3', '3级 - 一般：')}</span> {t('dreams:create.form.vividnessHelp.level3Desc', '梦境相对清晰，能够辨认人物和场景')}</div>
                              <div><span className="font-medium">{t('dreams:create.form.vividnessHelp.level4', '4级 - 清晰：')}</span> {t('dreams:create.form.vividnessHelp.level4Desc', '梦境生动清晰，细节丰富，接近现实体验')}</div>
                              <div><span className="font-medium">{t('dreams:create.form.vividnessHelp.level5', '5级 - 非常清晰：')}</span> {t('dreams:create.form.vividnessHelp.level5Desc', '梦境极其生动，所有感官都异常清晰，甚至超越现实')}</div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {t('dreams:create.form.vividnessHelp.note', '注意：清晰度与清醒度是两个不同的概念。清晰度关注感官体验，清醒度关注意识状态。')}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </Label>
                    <Slider
                      value={[formData.vividness]}
                      onValueChange={(value) => handleFieldChange('vividness', value[0])}
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <div className="vividness-labels">
                      <span>{t('dreams:create.form.vividnessLabels.min', '模糊')}</span>
                      <span>{t('dreams:create.form.vividnessLabels.max', '非常清晰')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <RecurringDreamField
                isRecurring={formData.is_recurring}
                onRecurringChange={(checked) => handleFieldChange('is_recurring', checked)}
                recurringElements={formData.recurring_elements}
                onElementsChange={(value) => handleFieldChange('recurring_elements', value)}
              />
            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <h3 className="section-title">
                <Heart className="w-5 h-5 mr-2" />
                {t('dreams:create.form.mood', '情绪')}
              </h3>

              <div className="moods-grid">
                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Moon className="w-4 h-4" />
                      {t('dreams:create.form.moodBeforeSleep', '睡前情绪')} <span className="optional-text">({t('common.optional', '可选')})</span>
                    </Label>
                    <Select value={formData.mood_before_sleep} onValueChange={(value) => handleFieldChange('mood_before_sleep', value)}>
                      <SelectTrigger className="enhanced-input transition-all duration-300">
                        <SelectValue placeholder={t('dreams:create.form.selectMood', '选择情绪')} />
                      </SelectTrigger>
                      <SelectContent>
                        {i18nMoods.map(mood => (
                          <SelectItem key={mood.value} value={mood.value}>
                            <span className="mood-option">{mood.i18nLabel}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Brain className="w-4 h-4" />
                      {t('dreams:create.form.moodInDream', '梦中情绪')} <span className="optional-text">({t('common.optional', '可选')})</span>
                    </Label>
                    <Select value={formData.mood_in_dream} onValueChange={(value) => handleFieldChange('mood_in_dream', value)}>
                      <SelectTrigger className="enhanced-input transition-all duration-300">
                        <SelectValue placeholder={t('dreams:create.form.selectMood', '选择情绪')} />
                      </SelectTrigger>
                      <SelectContent>
                        {i18nMoods.map(mood => (
                          <SelectItem key={mood.value} value={mood.value}>
                            <span className="mood-option">{mood.i18nLabel}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Sun className="w-4 h-4" />
                      {t('dreams:create.form.moodAfterWaking', '醒后情绪')} <span className="optional-text">({t('common.optional', '可选')})</span>
                    </Label>
                    <Select value={formData.mood_after_waking} onValueChange={(value) => handleFieldChange('mood_after_waking', value)}>
                      <SelectTrigger className="enhanced-input transition-all duration-300">
                        <SelectValue placeholder={t('dreams:create.form.selectMood', '选择情绪')} />
                      </SelectTrigger>
                      <SelectContent>
                        {i18nMoods.map(mood => (
                          <SelectItem key={mood.value} value={mood.value}>
                            <span className="mood-option">{mood.i18nLabel}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <h3 className="section-title">
                <Bed className="w-5 h-5 mr-2" />
                {t('dreams:create.form.sleepInfo', '睡眠信息')}
              </h3>

              <div className="sleep-grid">
                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Star className="w-4 h-4" />
                      {t('dreams:create.form.sleepQuality', '睡眠质量')} <span className="optional-text">({t('common.optional', '可选')})</span>
                    </Label>
                    <Select value={formData.sleep_quality} onValueChange={(value) => handleFieldChange('sleep_quality', value)}>
                      <SelectTrigger className="enhanced-input transition-all duration-300">
                        <SelectValue placeholder={t('dreams:create.form.selectSleepQuality', '选择睡眠质量')} />
                      </SelectTrigger>
                      <SelectContent>
                        {i18nSleepQualities.map(quality => (
                          <SelectItem key={quality.value} value={quality.value.toString()}>
                            <span className="quality-option">{quality.i18nLabel}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Clock className="w-4 h-4" />
                      {t('dreams:create.form.sleepDuration', '睡眠时长')} <span className="optional-text">({t('common.optional', '可选')}, {t('dreams:create.form.hours', '小时')})</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="24"
                      placeholder="8.5"
                      value={getDurationHours()}
                      onChange={(e) => handleDurationChange(e.target.value)}
                      className="enhanced-input transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Moon className="w-4 h-4" />
                      {t('dreams:create.form.bedtime', '就寝时间')} <span className="optional-text">({t('common.optional', '可选')})</span>
                    </Label>
                    <Input
                      type="time"
                      value={formData.bedtime}
                      onChange={(e) => handleFieldChange('bedtime', e.target.value)}
                      className="enhanced-input transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Sun className="w-4 h-4" />
                      {t('dreams:create.form.wakeTime', '醒来时间')} <span className="optional-text">({t('common.optional', '可选')})</span>
                    </Label>
                    <Input
                      type="time"
                      value={formData.wake_time}
                      onChange={(e) => handleFieldChange('wake_time', e.target.value)}
                      className="enhanced-input transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <h3 className="section-title">
                <NotebookPen className="w-5 h-5 mr-2" />
                {t('dreams:create.form.personalNotes', '个人笔记')}
                <span className="optional-text ml-auto">({t('common.optional', '可选')})</span>
              </h3>

              <div className="form-group">
                <EnhancedResizableTextarea
                  id="personal_notes"
                  value={formData.personal_notes}
                  onChange={(e) => handleFieldChange('personal_notes', e.target.value)}
                  className="transition-all duration-300"
                  minHeight={100}
                  maxHeight={350}
                  defaultHeight={100}
                  placeholder={t('dreams:create.form.personalNotesPlaceholder', '记录你的个人想法、感受或其他备注...')}
                />
              </div>
            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <h3 className="section-title">
                <Lock className="w-5 h-5 mr-2" />
                {t('dreams:create.form.privacy', '隐私设置')}
              </h3>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label className="enhanced-label">
                    <Globe className="w-4 h-4" />
                    {t('dreams:create.form.whoCanView', '谁可以查看这个梦境')}
                  </Label>
                  <div className="privacy-options">
                    {i18nPrivacyOptions.map(option => {
                      const IconComponent = option.value === 'private' ? Lock :
                        option.value === 'public' ? Sun : Cloud;
                      return (
                        <button
                          key={option.value}
                          className={`privacy-option transition-all duration-300 hover:scale-105 ${formData.privacy === option.value ? 'active' : ''}`}
                          onClick={() => handleFieldChange('privacy', option.value)}
                        >
                          <IconComponent className="h-5 w-5" />
                          <span>{option.i18nLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
                className="cancel-button"
              >
                <X className="w-4 h-4 mr-2" />
                {t('common.cancel', '取消')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="submit-button"
              >
                {isSubmitting ? t('common.saving', '创建中...') : t('dreams:create.button', '创建梦境')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CreateDream;