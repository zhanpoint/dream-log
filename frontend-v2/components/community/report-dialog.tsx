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

const REPORT_REASONS = [
  { value: "spam", label: "垃圾内容" },
  { value: "harassment", label: "骚扰或欺凌" },
  { value: "hate_speech", label: "仇恨言论" },
  { value: "misinformation", label: "虚假信息" },
  { value: "inappropriate", label: "不适当内容" },
  { value: "other", label: "其他原因" },
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

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("请选择举报原因");
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
      toast.success("举报已提交，我们会尽快处理");
      setOpen(false);
      setReason("");
      setDescription("");
    } catch {
      toast.error("举报提交失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>举报{targetType === "dream" ? "梦境" : "评论"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>举报原因</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full px-2.5 py-1.5 rounded-md text-sm border text-left transition-all duration-200 ease-out active:scale-[0.98] ${
                    reason === r.value
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border hover:border-primary/60 hover:bg-muted/60 hover:-translate-y-0.5 hover:shadow-sm"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">补充说明（可选）</Label>
            <Textarea
              id="description"
              placeholder="请描述具体问题..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-9 px-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading || !reason}
              className="h-9 px-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
            >
              {loading ? "提交中..." : "提交举报"}
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
              举报
            </Button>
          )}
        </DialogTrigger>
      )}
      {content}
    </Dialog>
  );
}
