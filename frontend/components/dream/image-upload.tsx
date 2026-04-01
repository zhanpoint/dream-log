"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  uploading?: boolean;
}

interface ImageUploadProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  className?: string;
}

let fileIdCounter = 0;

export function ImageUpload({
  files,
  onChange,
  maxFiles = 9,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { t } = useTranslation();

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const remaining = maxFiles - files.length;
      if (remaining <= 0) return;

      const accepted = Array.from(newFiles)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, remaining)
        .map((file) => ({
          id: `file_${++fileIdCounter}`,
          file,
          preview: URL.createObjectURL(file),
        }));

      if (accepted.length) {
        onChange([...files, ...accepted]);
      }
    },
    [files, maxFiles, onChange]
  );

  const removeFile = useCallback(
    (id: string) => {
      const target = files.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      onChange(files.filter((f) => f.id !== id));
    },
    [files, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* 预览网格 */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="relative aspect-square rounded-lg overflow-hidden group border border-border"
            >
              <Image
                src={f.preview}
                alt="preview"
                fill
                className="object-cover"
                unoptimized
              />
              {f.uploading ? (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              ) : (
                <button
                  type="button"
                  title={t("dreams.new.deleteImage")}
                  onClick={() => removeFile(f.id)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 上传触发器 */}
      {files.length < maxFiles && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            title={t("dreams.new.selectImage")}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={cn(
              "relative p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200",
              dragOver && "border-primary bg-primary/5"
            )}
            onClick={() => inputRef.current?.click()}
            title={t("dreams.new.uploadImage")}
          >
            <ImagePlus className="w-5 h-5" />
            {files.length > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                {files.length}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
