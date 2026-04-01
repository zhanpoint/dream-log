/**
 * 本地梦境编辑草稿（IndexedDB + idb-keyval）
 * 单条草稿 + 图片 Blob 分键存储，成功提交后清理。
 */

import { del, get, set } from "idb-keyval";

import type { UploadedFile } from "@/components/dream/image-upload";

const DRAFT_SCHEMA_VERSION = 1 as const;
const DRAFT_KEY = "dreamlog:editorDraft:v1";

/** sessionStorage：下次进入创建页时是否从 IndexedDB 自动恢复 */
export const DREAM_CREATE_RESTORE_SESSION_KEY = "dreamlog:createDreamRestoreNextVisit";

export function isCreateDreamRestoreNextVisit(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(DREAM_CREATE_RESTORE_SESSION_KEY) === "1";
}

export function setCreateDreamRestoreNextVisit(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(DREAM_CREATE_RESTORE_SESSION_KEY, "1");
}

export function clearCreateDreamRestoreNextVisit(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(DREAM_CREATE_RESTORE_SESSION_KEY);
}

export type DreamDraftFields = {
  title: string;
  content: string;
  dreamDateIso: string;
  dreamTime: string;
  isNap: boolean;
  primaryEmotion: string;
  emotionIntensity: string;
  emotionResidual: boolean;
  sleepStartTime: string;
  awakeningTime: string;
  sleepQuality: string;
  sleepDepth: string;
  sleepFragmented: boolean;
  sleepHours: string;
  sleepMinutes: string;
  awakeningState: string;
  dreamTypes: string[];
  lucidityLevel: string;
  vividness: string;
  completenessScore: string;
  lifeContext: string;
  realityCorrelation: string;
  userInterpretation: string;
  privacyLevel: "PRIVATE" | "FRIENDS" | "PUBLIC";
  titleGeneratedByAI: boolean;
  isAnonymous: boolean;
  isSeekingInterpretation: boolean;
  selectedCommunityId: string;
  shareToCommunityEnabled: boolean;
  textareaHeight: number;
  lifeContextHeight: number;
  userInterpretationHeight: number;
};

export type DreamDraftImageRef = {
  id: string;
  blobKey: string;
  fileName: string;
  mimeType: string;
};

export type DreamEditorDraftSnapshot = {
  schemaVersion: typeof DRAFT_SCHEMA_VERSION;
  updatedAt: number;
  mode: "create" | "edit";
  dreamId?: string;
  fields: DreamDraftFields;
  images: DreamDraftImageRef[];
};

function blobKeyFor(imageId: string) {
  return `dreamlog:draftBlob:${imageId}`;
}

export async function loadDraft(): Promise<DreamEditorDraftSnapshot | null> {
  const raw = await get<DreamEditorDraftSnapshot | null>(DRAFT_KEY);
  if (!raw || raw.schemaVersion !== DRAFT_SCHEMA_VERSION) return null;
  return raw;
}

export async function saveDraft(snapshot: DreamEditorDraftSnapshot): Promise<void> {
  await set(DRAFT_KEY, snapshot);
}

/** 写入每张图的 Blob，返回与 UploadedFile.id 对齐的引用列表 */
export async function persistImageBlobs(
  files: UploadedFile[]
): Promise<DreamDraftImageRef[]> {
  const refs: DreamDraftImageRef[] = [];
  for (const f of files) {
    const blobKey = blobKeyFor(f.id);
    await set(blobKey, f.file);
    refs.push({
      id: f.id,
      blobKey,
      fileName: f.file.name,
      mimeType: f.file.type || "application/octet-stream",
    });
  }
  return refs;
}

export async function loadUploadedFilesFromRefs(
  refs: DreamDraftImageRef[]
): Promise<UploadedFile[]> {
  const out: UploadedFile[] = [];
  for (const r of refs) {
    const blob = await get<Blob | undefined>(r.blobKey);
    if (!blob) continue;
    const file = new File([blob], r.fileName, { type: r.mimeType });
    out.push({
      id: r.id,
      file,
      preview: URL.createObjectURL(blob),
    });
  }
  return out;
}

export async function clearDraftBlobs(refs: DreamDraftImageRef[]): Promise<void> {
  for (const r of refs) {
    await del(r.blobKey);
  }
}

async function clearDraftRecord(): Promise<void> {
  await del(DRAFT_KEY);
}

/** 删除草稿主键及快照中列出的图片 Blob */
export async function clearDraftFully(snapshot: DreamEditorDraftSnapshot | null): Promise<void> {
  await clearDraftRecord();
  if (snapshot?.images?.length) {
    await clearDraftBlobs(snapshot.images);
  }
}

export function draftHasMeaningfulContent(d: DreamEditorDraftSnapshot | null): boolean {
  if (!d) return false;
  return Boolean(d.fields.content?.trim() || d.fields.title?.trim());
}
