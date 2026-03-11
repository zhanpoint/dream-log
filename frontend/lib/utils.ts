import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 数字超过三位数时加千位分隔符显示，如 4432 → "4,432" */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * 获取默认头像URL（使用 DiceBear API）
 */
export function getDefaultAvatar(userId: string): string {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId}`;
}

/**
 * 创建图片裁剪后的 Blob
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("无法创建 canvas context");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas is empty"));
        }
      },
      "image/jpeg",
      0.85
    );
  });
}

/**
 * 创建 Image 对象
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/** 搜索高亮：将文本按关键词切分为普通片段与匹配片段（用于渲染 <mark>） */
export function getHighlightSegments(
  text: string,
  keyword: string
): Array<string | { type: "mark"; text: string }> {
  if (!text) return [];
  if (!keyword || !keyword.trim()) return [text];
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  const segments: Array<string | { type: "mark"; text: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    segments.push(text.slice(lastIndex, match.index));
    segments.push({ type: "mark", text: match[1] });
    lastIndex = match.index + match[0].length;
  }
  segments.push(text.slice(lastIndex));
  return segments;
}