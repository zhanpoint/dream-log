"use client";

/**
 * RouteProgress - 路由切换顶部进度条
 * 
 * 当用户点击链接时立即显示进度条，消除"点击无响应"的感知延迟。
 * 使用 Next.js Navigation Events API 监听路由变化。
 */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

let progressBar: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let progressTimer: ReturnType<typeof setInterval> | null = null;
let currentWidth = 0;

function getOrCreateBar(): HTMLDivElement {
  if (!progressBar) {
    progressBar = document.createElement("div");
    progressBar.id = "nprogress-bar";
    progressBar.style.width = "0%";
    progressBar.style.opacity = "1";
    document.body.appendChild(progressBar);
  }
  return progressBar;
}

function startProgress() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (progressTimer) clearInterval(progressTimer);

  const bar = getOrCreateBar();
  currentWidth = 0;
  bar.style.width = "0%";
  bar.style.opacity = "1";
  bar.style.transition = "none";

  // 快速推进到 80%，然后缓慢推进模拟等待
  setTimeout(() => {
    bar.style.transition = "width 0.4s ease";
    bar.style.width = "60%";
    currentWidth = 60;

    progressTimer = setInterval(() => {
      if (currentWidth >= 90) {
        if (progressTimer) clearInterval(progressTimer);
        return;
      }
      currentWidth += (90 - currentWidth) * 0.1;
      bar.style.width = `${currentWidth}%`;
    }, 300);
  }, 10);
}

function completeProgress() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  const bar = getOrCreateBar();
  bar.style.transition = "width 0.2s ease, opacity 0.3s ease";
  bar.style.width = "100%";

  // 先淡出，然后在不可见状态下重置
  hideTimer = setTimeout(() => {
    bar.style.opacity = "0";
    hideTimer = setTimeout(() => {
      // 重置时保持不可见，下次 startProgress 会显示
      bar.style.transition = "none";
      bar.style.width = "0%";
      currentWidth = 0;
      // 不立即设置 opacity 为 1，让 startProgress 来控制
    }, 300);
  }, 200);
}

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const current = `${pathname}?${searchParams.toString()}`;
    if (prevPathRef.current !== null && prevPathRef.current !== current) {
      completeProgress();
    }
    prevPathRef.current = current;
  }, [pathname, searchParams]);

  // 为所有 Next.js Link 点击添加即时进度条启动
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a[href]");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto")) return;
      // 内部链接，启动进度条
      startProgress();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
