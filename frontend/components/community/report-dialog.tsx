"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { communityAPI } from "@/lib/community-api";
import { Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const REPORT_REASONS = [
  { value: "spam", labelKey: "community.report.reasons.spam" },
  { value: "harassment", labelKey: "community.report.reasons.harassment" },
  { value: "hate_speech", labelKey: "community.report.reasons.hateSpeech" },
  { value: "misinformation", labelKey: "community.report.reasons.misinformation" },
  { value: "inappropriate", labelKey: "community.report.reasons.inappropriate" },
  { value: "other", labelKey: "community.report.reasons.other" },
];

interface ReportDialogProps {
  targetType: "dream" | "comment";
  targetId: string;
  trigger?: React.ReactNode;
  /** 受控模式：由父组件控制打开/关闭（用于从下拉菜单触发时） */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ReportDialog({
  targetType,
  targetId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ReportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!reason) {
      toast.error(t("community.report.selectReasonError"));
      return;
    }
    setLoading(true);
    try {
      await communityAPI.createReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description || undefined,
      });
      toast.success(t("community.report.submitSuccess"));
      setOpen(false);
      setReason("");
      setDescription("");
    } catch {
      toast.error(t("community.report.submitFailed"));
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("community.report.title", {
              target: t(
                targetType === "dream"
                  ? "community.report.target.dream"
                  : "community.report.target.comment"
              ),
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{t("community.report.reasonLabel")}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() =>
                    setReason((prev) => (prev === r.value ? "" : r.value))
                  }
                  className={`w-full px-2.5 py-1.5 rounded-md text-sm border text-left transition-all duration-200 ease-out active:scale-[0.98] ${
                    reason === r.value
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border/80 dark:border-white/25 hover:border-primary/60 hover:-translate-y-0.5 hover:shadow-sm"
                  }`}
                >
                  {t(r.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">
              {t("community.report.descriptionLabel")}
            </Label>
            <div className="relative">
              <Textarea
                id="description"
                placeholder={t("community.report.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={200}
                className="min-h-[88px] resize-y pr-12 pb-6 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <span className="pointer-events-none absolute bottom-2.5 right-3 text-[11px] text-muted-foreground">
                {description.length}/200
              </span>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-9 px-4 text-muted-foreground dark:text-slate-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:text-foreground dark:hover:text-white"
            >
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading || !reason}
              className="h-9 px-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
            >
              {loading ? t("common.submitting") : t("community.report.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive">
              <Flag className="h-4 w-4" />
              {t("community.report.trigger")}
            </Button>
          )}
        </DialogTrigger>
      )}
      {content}
    </Dialog>
  );
}
