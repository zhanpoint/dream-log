"use client";

import { DreamEditor } from "../../new/page";
import { DreamApi, type DreamDetail } from "@/lib/dream-api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function EditDreamPage() {
  const params = useParams();
  const router = useRouter();
  const dreamId = params.id as string;

  const [dream, setDream] = useState<DreamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await DreamApi.get(dreamId);
        setDream(data);
          } catch {
        toast.error("加载梦境失败");
        router.push("/dreams");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dreamId, router]);

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!dream) {
    return null;
  }

  return <DreamEditor mode="edit" initialDream={dream} />;
}

