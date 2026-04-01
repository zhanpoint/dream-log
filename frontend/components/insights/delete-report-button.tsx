"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { insightAPI } from "@/lib/insight-api";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DeleteReportButtonProps {
  insightId: string;
  redirectTo: string;
  variant?: "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
}

export function DeleteReportButton({
  insightId,
  redirectTo,
  variant = "ghost",
  size = "sm",
  className,
  label,
}: DeleteReportButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await insightAPI.delete(insightId);
      toast.success(t("common.deleteSuccess"));
      setOpen(false);
      router.push(redirectTo);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("common.deleteFailed");
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "border-0 shadow-none bg-transparent text-destructive transition-all duration-200",
            "hover:!bg-transparent hover:text-destructive hover:scale-110 active:scale-95 active:!bg-transparent",
            className
          )}
          title={label ?? t("common.delete")}
        >
          <Trash2 className="h-4 w-4 transition-transform duration-200" />
          <span className="sr-only">{label ?? t("common.delete")}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label ?? t("common.delete")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("insights.report.deleteConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t("common.loading")}
              </>
            ) : (
              t("common.delete")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
