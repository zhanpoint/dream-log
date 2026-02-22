"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DREAM_TYPES,
  EMOTION_CATEGORIES,
  EMOTION_EMOJI_MAP,
  EMOTION_INTENSITIES,
  LUCIDITY_LEVELS,
  REALITY_CORRELATIONS,
  SLEEP_DEPTHS,
  SLEEP_QUALITIES,
  VIVIDNESS_LEVELS,
} from "@/lib/constants";
import { DreamApi, type CreateDreamPayload } from "@/lib/dream-api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft,
  Brain,
  ChevronDown,
  Eye,
  Heart,
  Link2,
  Loader2,
  Moon,
  Save,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export default function NewDreamPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // 核心表单状态
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dreamDate, setDreamDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // 情绪
  const [primaryEmotion, setPrimaryEmotion] = useState("");
  const [emotionIntensity, setEmotionIntensity] = useState("");
  const [emotionResidual, setEmotionResidual] = useState(false);

  // 睡眠
  const [sleepQuality, setSleepQuality] = useState("");
  const [sleepDepth, setSleepDepth] = useState("");
  const [sleepFragmented, setSleepFragmented] = useState(false);
  const [sleepHours, setSleepHours] = useState("");
  const [sleepMinutes, setSleepMinutes] = useState("");

  // 梦境特征
  const [dreamTypes, setDreamTypes] = useState<string[]>([]);
  const [lucidityLevel, setLucidityLevel] = useState("");
  const [vividness, setVividness] = useState("");

  // 现实关联
  const [lifeContext, setLifeContext] = useState("");
  const [realityCorrelation, setRealityCorrelation] = useState("");
  const [userInterpretation, setUserInterpretation] = useState("");

  const toggleDreamType = useCallback((type: string) => {
    setDreamTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("请描述你的梦境内容");
      return;
    }

    setSubmitting(true);
    try {
      // 计算睡眠时长
      const hours = parseInt(sleepHours) || 0;
      const mins = parseInt(sleepMinutes) || 0;
      const sleepDuration = hours || mins ? hours * 60 + mins : undefined;

      const payload: CreateDreamPayload = {
        dream_date: dreamDate,
        content: content.trim(),
        title: title.trim() || undefined,
        primary_emotion: primaryEmotion || undefined,
        emotion_intensity: emotionIntensity ? parseInt(emotionIntensity) : undefined,
        emotion_residual: emotionResidual || undefined,
        sleep_quality: sleepQuality ? parseInt(sleepQuality) : undefined,
        sleep_depth: sleepDepth ? parseInt(sleepDepth) : undefined,
        sleep_fragmented: sleepFragmented || undefined,
        sleep_duration_minutes: sleepDuration,
        dream_types: dreamTypes.length > 0 ? dreamTypes : undefined,
        lucidity_level: lucidityLevel ? parseInt(lucidityLevel) : undefined,
        vividness_level: vividness ? parseInt(vividness) : undefined,
        life_context: lifeContext.trim() || undefined,
        reality_correlation: realityCorrelation
          ? parseInt(realityCorrelation)
          : undefined,
        user_interpretation: userInterpretation.trim() || undefined,
      };

      const dream = await DreamApi.create(payload);
      toast.success("梦境记录成功！");
      router.push(`/dreams/${dream.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "保存失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* 顶部操作栏 */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-card/80 border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/dreams">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              {format(new Date(dreamDate), "yyyy年M月d日")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dreamDate}
              onChange={(e) => setDreamDate(e.target.value)}
              className="w-auto h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* ===== 核心输入区 ===== */}
        <Card className="border-none shadow-2xl bg-gradient-to-br from-card to-card/50">
          <CardContent className="p-6 md:p-8">
            <Input
              placeholder="给梦境起个标题（可选，AI 可帮你生成）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-semibold border-none bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/40 px-0 mb-4"
            />
            <Textarea
              placeholder="描述你的梦境... 放松，想到什么写什么"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] text-base leading-relaxed border-none bg-transparent resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40 px-0"
            />
            <div className="flex items-center justify-end pt-4 border-t border-border/50">
              <span className="text-sm text-muted-foreground">
                {content.length} 字
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ===== 情绪与感受 ===== */}
        <Card className="overflow-hidden hover:shadow-lg transition-all border-l-4 border-l-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="w-5 h-5 text-primary" />
              情绪与感受
            </CardTitle>
            <CardDescription className="text-xs">
              只需3步，AI会帮你分析更多细节
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 步骤1: 主导情绪 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                1. 梦中最主要的感觉是？
              </Label>
              <div className="space-y-3">
                {EMOTION_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <p className="text-xs text-muted-foreground mb-2">
                      {cat.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cat.emotions.map((e) => (
                        <Badge
                          key={e}
                          variant={primaryEmotion === e ? "default" : "outline"}
                          className="cursor-pointer hover:scale-105 transition-transform px-3 py-1.5"
                          onClick={() =>
                            setPrimaryEmotion(primaryEmotion === e ? "" : e)
                          }
                        >
                          {EMOTION_EMOJI_MAP[e]} {e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 步骤2: 强度 */}
            {primaryEmotion && (
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  2. 这种感觉有多强？
                </Label>
                <RadioGroup
                  value={emotionIntensity}
                  onValueChange={setEmotionIntensity}
                >
                  <div className="grid grid-cols-5 gap-2">
                    {EMOTION_INTENSITIES.map((level) => (
                      <div key={level.value}>
                        <RadioGroupItem
                          value={level.value}
                          id={`intensity-${level.value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`intensity-${level.value}`}
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                        >
                          <span className="text-2xl mb-1">{level.emoji}</span>
                          <span className="text-xs font-medium">
                            {level.label}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* 步骤3: 情绪残留 */}
            {primaryEmotion && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-accent/30 border border-border">
                <div>
                  <Label className="text-sm font-medium">
                    3. 醒来后这种感觉还在吗？
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    情绪残留说明梦境对现实有影响
                  </p>
                </div>
                <Switch
                  checked={emotionResidual}
                  onCheckedChange={setEmotionResidual}
                />
              </div>
            )}

            {/* AI 提示 */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                AI 会基于你的描述，自动分析 8 种情绪维度的细微差异，无需手动填写
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ===== 睡眠质量 ===== */}
        <Card className="overflow-hidden hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="w-5 h-5" />
              睡眠质量
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 质量 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                昨晚睡得怎么样？
              </Label>
              <RadioGroup
                value={sleepQuality}
                onValueChange={setSleepQuality}
              >
                <div className="grid grid-cols-5 gap-2">
                  {SLEEP_QUALITIES.map((q) => (
                    <div key={q.value}>
                      <RadioGroupItem
                        value={q.value}
                        id={`quality-${q.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`quality-${q.value}`}
                        className="flex flex-col items-center rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                      >
                        <span className="text-2xl mb-1">{q.emoji}</span>
                        <span className="text-xs font-medium">{q.label}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {q.desc}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* 深度 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">睡眠深度</Label>
              <div className="grid grid-cols-3 gap-2">
                {SLEEP_DEPTHS.map((d) => (
                  <Button
                    key={d.value}
                    type="button"
                    variant={sleepDepth === d.value ? "default" : "outline"}
                    onClick={() =>
                      setSleepDepth(sleepDepth === d.value ? "" : d.value)
                    }
                    className="h-auto flex-col py-3"
                  >
                    <span className="text-2xl mb-1">{d.icon}</span>
                    <span className="font-medium">{d.label}</span>
                    <span className="text-xs opacity-70">{d.desc}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* 碎片化 */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <Label className="text-sm font-medium">夜里多次醒来？</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  睡眠碎片化会影响梦境质量
                </p>
              </div>
              <Switch
                checked={sleepFragmented}
                onCheckedChange={setSleepFragmented}
              />
            </div>

            {/* 时长 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">睡了多久？</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="小时"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="w-20"
                />
                <span className="text-muted-foreground text-sm">时</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="分钟"
                  value={sleepMinutes}
                  onChange={(e) => setSleepMinutes(e.target.value)}
                  className="w-20"
                />
                <span className="text-muted-foreground text-sm">分</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {[6, 7, 8, 9].map((h) => (
                  <Button
                    key={h}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSleepHours(String(h));
                      setSleepMinutes("0");
                    }}
                  >
                    {h}小时
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== 梦境特征 ===== */}
        <Card className="overflow-hidden hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5" />
              梦境特征
            </CardTitle>
            <CardDescription className="text-xs">
              可以多选，描述这个梦的特点
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 类型 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">梦境类型</Label>
              <div className="flex flex-wrap gap-2">
                {DREAM_TYPES.map((t) => (
                  <Badge
                    key={t.value}
                    variant={
                      dreamTypes.includes(t.value) ? "default" : "outline"
                    }
                    className="cursor-pointer hover:scale-105 transition-transform px-3 py-2"
                    onClick={() => toggleDreamType(t.value)}
                    title={t.desc}
                  >
                    <span className="mr-1.5">{t.icon}</span>
                    {t.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 清醒梦专属 */}
            {dreamTypes.includes("LUCID") && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  清醒程度
                </Label>
                <RadioGroup
                  value={lucidityLevel}
                  onValueChange={setLucidityLevel}
                >
                  <div className="space-y-2">
                    {LUCIDITY_LEVELS.map((l) => (
                      <div
                        key={l.value}
                        className="flex items-center space-x-3"
                      >
                        <RadioGroupItem
                          value={l.value}
                          id={`lucid-${l.value}`}
                        />
                        <Label
                          htmlFor={`lucid-${l.value}`}
                          className="flex-1 cursor-pointer p-2 rounded hover:bg-accent/50"
                        >
                          <div className="font-medium text-sm">{l.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.desc}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* 清晰度 */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                梦境清晰度
              </Label>
              <RadioGroup value={vividness} onValueChange={setVividness}>
                <div className="grid grid-cols-5 gap-2">
                  {VIVIDNESS_LEVELS.map((v) => (
                    <div key={v.value}>
                      <RadioGroupItem
                        value={v.value}
                        id={`vivid-${v.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`vivid-${v.value}`}
                        className="flex flex-col items-center rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                      >
                        <span className="text-2xl mb-1">{v.emoji}</span>
                        <span className="text-xs font-medium">{v.label}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {v.desc}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* ===== 现实关联 (可折叠) ===== */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader className="flex-row items-center justify-between py-4">
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-base">与现实的关联</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      帮助 AI 理解梦境的现实背景
                    </CardDescription>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="pt-6 space-y-5">
                {/* 前一天事件 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    前一天发生了什么？（可选）
                  </Label>
                  <Textarea
                    placeholder="简单描述前一天的主要事件、情绪或压力源..."
                    value={lifeContext}
                    onChange={(e) => setLifeContext(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                {/* 关联程度 */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    这个梦和现实生活的关联度？
                  </Label>
                  <RadioGroup
                    value={realityCorrelation}
                    onValueChange={setRealityCorrelation}
                  >
                    <div className="space-y-2">
                      {REALITY_CORRELATIONS.map((r) => (
                        <div
                          key={r.value}
                          className="flex items-start space-x-3"
                        >
                          <RadioGroupItem
                            value={r.value}
                            id={`corr-${r.value}`}
                            className="mt-1"
                          />
                          <Label
                            htmlFor={`corr-${r.value}`}
                            className="flex-1 cursor-pointer p-3 rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 font-medium text-sm mb-1">
                              <span>{r.icon}</span>
                              {r.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.desc}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* 个人解读 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    你自己的理解（可选）
                  </Label>
                  <Textarea
                    placeholder="你觉得这个梦可能在表达什么？"
                    value={userInterpretation}
                    onChange={(e) => setUserInterpretation(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* ===== 提交区 ===== */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href="/dreams">
            <Button variant="outline">取消</Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="gap-2 min-w-[120px]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            保存梦境
          </Button>
        </div>
      </div>
    </div>
  );
}
