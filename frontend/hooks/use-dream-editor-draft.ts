"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";

import {
  persistImageBlobs,
  saveDraft,
  type DreamEditorDraftSnapshot,
} from "@/lib/dream-draft-storage";
import type { UploadedFile } from "@/components/dream/image-upload";

type BuildSnapshot = () => Omit<
  DreamEditorDraftSnapshot,
  "schemaVersion" | "updatedAt" | "images"
> & { imageFiles: UploadedFile[] };

type UseDreamEditorDraftOptions = {
  enabled: boolean;
  debounceMs: number;
  buildSnapshot: BuildSnapshot;
  /** 为 true 时不做 pagehide/visibility 的强制 flush（如用户已通过离开弹窗或提交处理草稿） */
  skipFlushRef?: MutableRefObject<boolean>;
  /** 仅在 `pagehide` 且 flush 完成后调用（如打 session 恢复标记）；不在 visibilitychange 时调用 */
  afterPageHideFlush?: () => void;
};

/**
 * 防抖写入 IDB；visibility 隐藏与 pagehide 时强制 flush（可配合 skipFlushRef）。
 * pagehide 完成后可调用 afterPageHideFlush（如写入「下次恢复」session 标记）。
 */
export function useDreamEditorDraft({
  enabled,
  debounceMs,
  buildSnapshot,
  skipFlushRef,
  afterPageHideFlush,
}: UseDreamEditorDraftOptions) {
  const buildSnapshotRef = useRef(buildSnapshot);
  buildSnapshotRef.current = buildSnapshot;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(async () => {
    if (!enabled || typeof indexedDB === "undefined") return;
    try {
      const partial = buildSnapshotRef.current();
      const { imageFiles, ...rest } = partial;
      const images = await persistImageBlobs(imageFiles);
      const snapshot: DreamEditorDraftSnapshot = {
        schemaVersion: 1,
        updatedAt: Date.now(),
        ...rest,
        images,
      };
      await saveDraft(snapshot);
    } catch {
      // 本地草稿失败不阻塞主流程
    }
  }, [enabled]);

  const scheduleSave = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, debounceMs);
  }, [enabled, debounceMs, flush]);

  const afterPageHideFlushRef = useRef(afterPageHideFlush);
  afterPageHideFlushRef.current = afterPageHideFlush;

  useEffect(() => {
    if (!enabled) {
      cancelPendingSave();
      return;
    }
    const onVis = () => {
      if (skipFlushRef?.current) return;
      if (document.visibilityState === "hidden") void flush();
    };
    const onPageHide = () => {
      if (skipFlushRef?.current) return;
      void flush().then(() => {
        afterPageHideFlushRef.current?.();
      });
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
      cancelPendingSave();
    };
  }, [enabled, flush, cancelPendingSave, skipFlushRef]);

  return {
    flush,
    scheduleSave,
    cancelPendingSave,
  };
}
