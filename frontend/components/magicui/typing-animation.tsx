"use client";

import { cn } from "@/lib/utils";
import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const cursorChar = {
  line: "|",
  block: "▌",
  underscore: "_",
} as const;

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface TypingAnimationProps {
  /** 要打字的完整字符串（可含 \\n，内层使用 whitespace-pre-line） */
  children: string;
  className?: string;
  /** 渐变文字上的类（如 hero-title） */
  gradientClassName?: string;
  style?: CSSProperties;
  /** 每个字符间隔（ms），略小则更利落 */
  typeSpeed?: number;
  delay?: number;
  /** 进入视口后再开始 */
  startOnView?: boolean;
  showCursor?: boolean;
  /** 打字进行中光标是否轻微闪烁（完成后光标始终隐藏） */
  blinkCursor?: boolean;
  cursorStyle?: keyof typeof cursorChar;
}

export function TypingAnimation({
  children: text,
  className,
  gradientClassName,
  style,
  typeSpeed = 58,
  delay = 220,
  startOnView = true,
  showCursor = true,
  blinkCursor = false,
  cursorStyle = "line",
}: TypingAnimationProps) {
  const [displayed, setDisplayed] = useState("");
  const [complete, setComplete] = useState(false);
  const [inView, setInView] = useState(!startOnView);
  const rootRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false
  );

  useEffect(() => {
    if (!startOnView) {
      setInView(true);
      return;
    }
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -48px 0px", threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [startOnView]);

  useEffect(() => {
    setComplete(false);
    if (!text) {
      setDisplayed("");
      setComplete(true);
      return;
    }

    if (!inView) return;

    if (reducedMotion) {
      setDisplayed(text);
      setComplete(true);
      return;
    }

    let i = 0;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (cancelled) return;
      setDisplayed(text.slice(0, i));
      if (i < text.length) {
        i += 1;
        timeoutId = setTimeout(tick, typeSpeed);
      } else {
        setComplete(true);
      }
    };

    timeoutId = setTimeout(tick, delay);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [text, inView, reducedMotion, typeSpeed, delay]);

  const cursor = showCursor && !complete ? cursorChar[cursorStyle] : null;

  return (
    <span
      ref={rootRef}
      className={cn(
        "inline-block max-w-full text-center text-balance tracking-tight",
        className
      )}
      style={style}
    >
      <span
        className={cn(
          "animate-gradient bg-gradient-to-r from-[var(--color-from)] via-[var(--color-to)] to-[var(--color-from)] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent whitespace-pre-line",
          gradientClassName
        )}
        aria-label={text}
      >
        {displayed}
      </span>
      {cursor ? (
        <span
          className={cn(
            "select-none font-light text-primary align-baseline motion-reduce:opacity-100",
            blinkCursor && "motion-safe:animate-pulse"
          )}
          aria-hidden
        >
          {cursor}
        </span>
      ) : null}
    </span>
  );
}
