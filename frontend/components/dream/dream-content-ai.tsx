"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DreamApi } from "@/lib/dream-api";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  CornerDownRight,
  Feather,
  Image as ImageIcon,
  Loader2,
  Sparkle,
  Send,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type AssistAction = "imagery_completion" | "literary_polish" | "smart_continue";
type AssistActionOrNone = AssistAction | null;

const MODES: {
  key: AssistAction;
  labelKey: string;
  helpKey: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  {
    key: "imagery_completion",
    labelKey: "dreams.new.contentAi.modeImagery",
    helpKey: "dreams.new.contentAi.modeImageryHelp",
    icon: ImageIcon,
  },
  {
    key: "literary_polish",
    labelKey: "dreams.new.contentAi.modeLiterary",
    helpKey: "dreams.new.contentAi.modeLiteraryHelp",
    icon: Feather,
  },
  {
    key: "smart_continue",
    labelKey: "dreams.new.contentAi.modeContinue",
    helpKey: "dreams.new.contentAi.modeContinueHelp",
    icon: CornerDownRight,
  },
];

const INSTRUCTION_MAX = 500;
const DREAM_CONTENT_MAX = 3000;

/** 相对主列左右各收进同样像素，面板在列内水平居中 */
const PANEL_EDGE_INSET_PX = 16;

/** 面板底栏图标：暗色模式下避免灰白 hover，统一紫色调 */
const toolbarIconClass = cn(
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95",
  "text-zinc-600 dark:text-zinc-300",
  "hover:bg-violet-500/15 hover:text-violet-700",
  "dark:hover:bg-violet-400/20 dark:hover:text-violet-200",
  "disabled:pointer-events-none disabled:opacity-40"
);

function AutoResizeInstruction({
  value,
  onChange,
  onKeyDown,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  disabled?: boolean;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      disabled={disabled}
      maxLength={INSTRUCTION_MAX}
      onChange={(e) => onChange(e.target.value.slice(0, INSTRUCTION_MAX))}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={cn(
        "min-h-[40px] w-full resize-none overflow-hidden scrollbar-hide bg-transparent px-3 py-2.5 text-sm leading-relaxed",
        "placeholder:text-muted-foreground",
        "rounded-none border-0",
        "focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      )}
    />
  );
}

type DreamContentAiState = {
  t: (key: string) => string;
  layoutAnchorRef?: RefObject<HTMLElement | null>;
  open: boolean;
  setOpen: (v: boolean) => void;
  instruction: string;
  setInstruction: (v: string) => void;
  action: AssistActionOrNone;
  setAction: (v: AssistActionOrNone) => void;
  preview: string | null;
  loading: boolean;
  optimizingInstruction: boolean;
  canUndoInstruction: boolean;
  run: () => Promise<void>;
  stop: () => void;
  clearInstruction: () => void;
  optimizeInstruction: () => Promise<void>;
  undoInstruction: () => void;
  apply: () => void;
  discard: () => void;
  rewrite: () => void;
};

const DreamContentAiStateContext = createContext<DreamContentAiState | null>(null);

function useDreamContentAi() {
  const c = useContext(DreamContentAiStateContext);
  if (!c) throw new Error("DreamContentAiProvider required");
  return c;
}

export function DreamContentAiProvider({
  children,
  content,
  onContentChange,
  onLoadingChange,
  maxLength = DREAM_CONTENT_MAX,
  layoutAnchorRef,
}: {
  children: ReactNode;
  content: string;
  onContentChange: (v: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  maxLength?: number;
  /** 与主编辑列同宽的容器，用于 AI 面板左右边缘与该列对齐 */
  layoutAnchorRef?: RefObject<HTMLElement | null>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [instructionUndoStack, setInstructionUndoStack] = useState<string[]>([]);
  const [action, setAction] = useState<AssistActionOrNone>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingOriginalContent, setPendingOriginalContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizingInstruction, setOptimizingInstruction] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const clearInstruction = useCallback(() => {
    setInstruction("");
    setInstructionUndoStack([]);
  }, []);

  const optimizeInstruction = useCallback(async () => {
    const cur = instruction.trim();
    if (!cur) {
      toast.error(t("dreams.new.contentAi.needInstructionForOptimize"));
      return;
    }
    setOptimizingInstruction(true);
    try {
      const { text } = await DreamApi.optimizeInstruction(cur);
      const next = text.slice(0, INSTRUCTION_MAX);
      setInstructionUndoStack((s) => [...s, instruction]);
      setInstruction(next);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : t("dreams.new.contentAi.optimizeFailed"));
    } finally {
      setOptimizingInstruction(false);
    }
  }, [instruction, t]);

  const undoInstruction = useCallback(() => {
    setInstructionUndoStack((s) => {
      if (s.length === 0) return s;
      const copy = [...s];
      const prev = copy.pop()!;
      setInstruction(prev);
      return copy;
    });
  }, []);

  const run = useCallback(async () => {
    const sourceContent = pendingOriginalContent ?? content;
    const trimmed = sourceContent.trim();
    const ins = instruction.trim();
    if (ins.length < 2) {
      toast.error(t("dreams.new.contentAi.needInstructionMin2"));
      return;
    }
    if (action === "literary_polish" && trimmed.length < 5) {
      toast.error(t("dreams.new.contentAi.needMoreForPolish"));
      return;
    }
    if (action === "smart_continue" && trimmed.length < 5) {
      toast.error(t("dreams.new.contentAi.needMoreForContinue"));
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      // 生成后默认显示 AI 文本，但在用户确认前可弃用回到原正文
      setPendingOriginalContent(sourceContent);
      let acc = "";
      let picked: AssistAction | null = null;
      let pendingChunk = "";
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const flushPending = () => {
        if (!pendingChunk) return;
        acc += pendingChunk;
        pendingChunk = "";
        const partial = acc.trimStart();
        onContentChange(partial.slice(0, maxLength));
      };
      const scheduleFlush = () => {
        if (flushTimer != null) return;
        flushTimer = setTimeout(() => {
          flushTimer = null;
          flushPending();
        }, 30);
      };
      await DreamApi.assistContentStream(
        {
          content: sourceContent,
          action,
          instruction: ins,
        },
        {
          signal: ac.signal,
          onMeta: ({ action: actionUsed }) => {
            picked = actionUsed;
          },
          onDelta: (delta) => {
            pendingChunk += delta;
            scheduleFlush();
          },
          onDone: ({ text, action: actionUsed }) => {
            if (flushTimer != null) {
              clearTimeout(flushTimer);
              flushTimer = null;
            }
            flushPending();
            const finalText = (text || "").trim();
            if (!finalText) return;
            picked = actionUsed;
            onContentChange(finalText.slice(0, maxLength));
            setPreview(finalText);
          },
        }
      );
      if (flushTimer != null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushPending();
      if (!picked) {
        // no-op: action 仅用于后端模式执行，前端确认流不依赖该字段
      }
    } catch (e: unknown) {
      const err = e as {
        code?: string;
        name?: string;
        message?: string;
        response?: { data?: { detail?: string } };
      };
      if (err.name === "CanceledError" || err.message === "canceled" || err.code === "ERR_CANCELED") {
        return;
      }
      if (pendingOriginalContent == null) {
        onContentChange(sourceContent);
      }
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : err.message || t("dreams.new.contentAi.assistFailed"));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [action, content, instruction, maxLength, onContentChange, pendingOriginalContent, t]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const apply = useCallback(() => {
    if (preview == null) return;
    // 正文已经是 AI 文本，这里只做“确认采纳”状态收口
    setPreview(null);
    setPendingOriginalContent(null);
    setOpen(false);
    toast.success(t("dreams.new.contentAi.applied"));
  }, [preview, t]);

  const discard = useCallback(() => {
    if (pendingOriginalContent != null) {
      onContentChange(pendingOriginalContent.slice(0, maxLength));
    }
    setPreview(null);
    setPendingOriginalContent(null);
  }, [maxLength, onContentChange, pendingOriginalContent]);

  const rewrite = useCallback(() => {
    void run();
  }, [run]);

  useEffect(() => {
    if (!loading) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, stop]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  const canUndoInstruction = instructionUndoStack.length > 0;

  const value = useMemo<DreamContentAiState>(
    () => ({
      t,
      layoutAnchorRef,
      open,
      setOpen,
      instruction,
      setInstruction,
      action,
      setAction,
      preview,
      loading,
      optimizingInstruction,
      canUndoInstruction,
      run,
      stop,
      clearInstruction,
      optimizeInstruction,
      undoInstruction,
      apply,
      discard,
      rewrite,
    }),
    [
      t,
      layoutAnchorRef,
      open,
      instruction,
      action,
      preview,
      loading,
      optimizingInstruction,
      canUndoInstruction,
      run,
      stop,
      clearInstruction,
      optimizeInstruction,
      undoInstruction,
      apply,
      discard,
      rewrite,
    ]
  );

  return (
    <DreamContentAiStateContext.Provider value={value}>{children}</DreamContentAiStateContext.Provider>
  );
}

export function DreamContentAiPreviewBlock() {
  return null;
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          title={title}
          aria-label={title}
          className={cn(toolbarIconClass, className)}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

export function DreamContentAiToolbarButton() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelLayout, setPanelLayout] = useState({ width: 0, alignOffset: 0 });

  const {
    t,
    layoutAnchorRef,
    open,
    setOpen,
    instruction,
    setInstruction,
    action,
    setAction,
    preview,
    loading,
    optimizingInstruction,
    canUndoInstruction,
    apply,
    discard,
    rewrite,
    run,
    stop,
    clearInstruction,
    optimizeInstruction,
    undoInstruction,
  } = useDreamContentAi();

  const busy = loading || optimizingInstruction;
  const canRun = !busy && instruction.trim().length >= 2;
  const modeLabel =
    action == null
      ? t("dreams.new.contentAi.modeMenuTitle")
      : t(MODES.find((m) => m.key === action)?.labelKey ?? "dreams.new.contentAi.modeImagery");

  const updatePanelLayout = useCallback(() => {
    const anchor = layoutAnchorRef?.current;
    const tr = triggerRef.current;
    if (!anchor) {
      setPanelLayout({ width: 0, alignOffset: 0 });
      return;
    }
    const ar = anchor.getBoundingClientRect();
    const inset = PANEL_EDGE_INSET_PX * 2;
    const width = Math.max(0, Math.round(ar.width - inset));
    if (!tr) {
      setPanelLayout({ width, alignOffset: 0 });
      return;
    }
    const trr = tr.getBoundingClientRect();
    setPanelLayout({
      width,
      alignOffset: Math.round(ar.left - trr.left + PANEL_EDGE_INSET_PX),
    });
  }, [layoutAnchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelLayout();
    const anchor = layoutAnchorRef?.current;
    const ro = anchor ? new ResizeObserver(() => updatePanelLayout()) : null;
    if (anchor && ro) ro.observe(anchor);
    window.addEventListener("resize", updatePanelLayout);
    window.addEventListener("scroll", updatePanelLayout, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updatePanelLayout);
      window.removeEventListener("scroll", updatePanelLayout, true);
    };
  }, [open, layoutAnchorRef, updatePanelLayout]);

  const handleInstructionKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key !== "Enter" || event.shiftKey) return;
      event.preventDefault();
      if (!canRun) return;
      void run();
    },
    [canRun, run]
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              "group flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
              "text-fuchsia-500 hover:text-fuchsia-400 dark:text-fuchsia-400 dark:hover:text-fuchsia-300",
              "hover:bg-fuchsia-500/10 dark:hover:bg-fuchsia-400/20",
              "active:scale-95",
              open && "text-fuchsia-500 dark:text-fuchsia-300 bg-fuchsia-500/10 dark:bg-fuchsia-500/20"
            )}
            title={t("dreams.new.contentAi.triggerTitle")}
            aria-label={t("dreams.new.contentAi.triggerTitle")}
          >
            <Sparkles
              className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 motion-safe:animate-pulse motion-reduce:animate-none"
              strokeWidth={2}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          alignOffset={panelLayout.width > 0 ? panelLayout.alignOffset : 0}
          side="bottom"
          sideOffset={18}
          avoidCollisions={false}
          className={cn(
            panelLayout.width > 0 ? "max-w-none w-auto" : "w-[min(calc(100vw-2rem),42rem)]",
            "p-0 overflow-hidden",
            "border-border/60 shadow-xl rounded-xl bg-popover text-popover-foreground"
          )}
          style={
            panelLayout.width > 0 ? { width: panelLayout.width } : undefined
          }
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col bg-popover">
            <AutoResizeInstruction
              value={instruction}
              onChange={setInstruction}
              onKeyDown={handleInstructionKeyDown}
              disabled={busy}
              placeholder={t("dreams.new.contentAi.inputPlaceholder")}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-popover">
              <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="h-4 w-4 animate-spin text-fuchsia-600 shrink-0" />
                <span className="text-xs font-medium truncate">{t("dreams.new.contentAi.generating")}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1 text-[11px] px-2 shrink-0 rounded-lg",
                  "text-zinc-700 dark:text-zinc-200",
                  "hover:bg-violet-500/15 hover:text-violet-700",
                  "dark:hover:bg-violet-400/20 dark:hover:text-violet-100",
                  "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                )}
                onClick={stop}
              >
                <Square className="h-3 w-3" />
                {t("dreams.new.contentAi.stop")}
              </Button>
            </div>
          ) : preview != null ? (
            <div className="flex items-center gap-2 px-2 py-2 bg-popover">
              <Button
                type="button"
                size="sm"
                className={cn(
                  "h-8 gap-1 rounded-lg border-0 shadow-sm",
                  "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white",
                  "hover:from-violet-500 hover:to-fuchsia-500",
                  "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                )}
                onClick={apply}
              >
                <Check className="h-3.5 w-3.5" />
                {t("dreams.new.contentAi.keep")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-8 gap-1 rounded-lg border-0",
                  "text-zinc-700 dark:text-zinc-200",
                  "hover:bg-violet-500/15 hover:text-violet-700",
                  "dark:hover:bg-violet-400/20 dark:hover:text-violet-100",
                  "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                )}
                onClick={rewrite}
              >
                <Wand2 className="h-3.5 w-3.5" />
                {t("dreams.new.contentAi.rewrite")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-8 gap-1 rounded-lg border-0",
                  "text-zinc-700 dark:text-zinc-200",
                  "hover:bg-violet-500/15 hover:text-violet-700",
                  "dark:hover:bg-violet-400/20 dark:hover:text-violet-100",
                  "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                )}
                onClick={discard}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("dreams.new.contentAi.discard")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2 py-2 bg-popover">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={busy}
                    title={
                      action == null
                        ? t("dreams.new.contentAi.modeMenuTitle")
                        : `${t("dreams.new.contentAi.modeMenuTitle")} · ${modeLabel}`
                    }
                    aria-label={
                      action == null
                        ? t("dreams.new.contentAi.modeMenuTitle")
                        : `${t("dreams.new.contentAi.modeMenuTitle")}: ${modeLabel}`
                    }
                    className={cn(
                      "inline-flex h-8 min-w-0 max-w-[12.5rem] shrink-0 items-center gap-1 rounded-lg pl-2 pr-1 text-xs font-medium transition-colors active:scale-95",
                      "text-zinc-600 dark:text-zinc-300",
                      "hover:bg-violet-500/15 hover:text-violet-700",
                      "dark:hover:bg-violet-400/20 dark:hover:text-violet-200",
                      "disabled:pointer-events-none disabled:opacity-40"
                    )}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
                    <span className="truncate">{modeLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[12rem]">
                  <DropdownMenuItem
                    className="flex items-center gap-2 pl-2"
                    onClick={() => setAction(null)}
                  >
                    <span className="flex w-4 shrink-0 justify-center">
                      {action == null ? (
                        <Check className="h-4 w-4 text-violet-600" strokeWidth={2.5} />
                      ) : null}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-2">
                        <Sparkle className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
                        <span className="truncate">{t("dreams.new.contentAi.modeAuto")}</span>
                      </div>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        {t("dreams.new.contentAi.modeAutoHelp")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  {MODES.map(({ key, labelKey, helpKey, icon: Icon }) => (
                    <DropdownMenuItem
                      key={key}
                      className="flex items-start gap-2 pl-2 py-2"
                      onClick={() => setAction(key)}
                    >
                      <span className="flex w-4 shrink-0 justify-center">
                        {action === key ? (
                          <Check className="h-4 w-4 text-violet-600" strokeWidth={2.5} />
                        ) : null}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
                          <span className="truncate">{t(labelKey)}</span>
                        </div>
                        <span className="text-[11px] leading-snug text-muted-foreground">
                          {t(helpKey)}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <IconBtn title={t("dreams.new.contentAi.clearInstruction")} onClick={clearInstruction} disabled={busy}>
                <X className="h-4 w-4" />
              </IconBtn>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={
                      busy || optimizingInstruction || (!canUndoInstruction && !instruction.trim())
                    }
                    title={
                      optimizingInstruction
                        ? t("dreams.new.contentAi.optimizingInstruction")
                        : canUndoInstruction
                          ? t("dreams.new.contentAi.undoOptimize")
                          : t("dreams.new.contentAi.optimizeInstruction")
                    }
                    aria-label={
                      optimizingInstruction
                        ? t("dreams.new.contentAi.optimizingInstruction")
                        : canUndoInstruction
                          ? t("dreams.new.contentAi.undoOptimize")
                          : t("dreams.new.contentAi.optimizeInstruction")
                    }
                    onClick={() => {
                      if (optimizingInstruction) return;
                      if (canUndoInstruction) undoInstruction();
                      else void optimizeInstruction();
                    }}
                    className={toolbarIconClass}
                  >
                    {optimizingInstruction ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-600 dark:text-violet-400" />
                    ) : canUndoInstruction ? (
                      <Undo2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                    ) : (
                      <Wand2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {optimizingInstruction
                    ? t("dreams.new.contentAi.optimizingInstruction")
                    : canUndoInstruction
                      ? t("dreams.new.contentAi.undoOptimize")
                      : t("dreams.new.contentAi.optimizeInstruction")}
                </TooltipContent>
              </Tooltip>

              <div className="min-w-0 flex-1" aria-hidden />

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!canRun}
                    onClick={() => void run()}
                    title={t("dreams.new.contentAi.run")}
                    aria-label={t("dreams.new.contentAi.run")}
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-sm",
                      "hover:from-violet-500 hover:to-fuchsia-500",
                      "disabled:opacity-40 disabled:pointer-events-none",
                      "transition-colors"
                    )}
                  >
                    <Send className="h-4 w-4" strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {canRun ? t("dreams.new.contentAi.run") : t("dreams.new.contentAi.needInstructionMin2")}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          <div className="h-0.5 w-full bg-gradient-to-r from-pink-400 via-violet-500 to-cyan-400 opacity-90" />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
