"use client";

import { useEffect } from "react";

function upsertDescription(content: string) {
  let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export function usePageMetadata(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    upsertDescription(description);
  }, [title, description]);
}
