"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { passkeyAPI, type PasskeyItem } from "@/lib/passkey-api";
import { isPasskeyUserCancelError, passkeyRegister } from "@/lib/passkey-client";

export function PasskeysSection() {
  const { t } = useTranslation();
  const [items, setItems] = useState<PasskeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [code, setCode] = useState("");
  const [isStepUpOk, setIsStepUpOk] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await passkeyAPI.listPasskeys();
      setItems(list);
    } catch (e: any) {
      toast.error(e?.message ?? t("settings.passkeys.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const canVerify = useMemo(() => /^\d{6}$/.test(code), [code]);

  const handleSendCode = async () => {
    setIsSendingCode(true);
    try {
      await passkeyAPI.enrollSendCode();
      toast.success(t("settings.passkeys.codeSent"));
    } catch (e: any) {
      toast.error(e?.message ?? t("settings.passkeys.codeSendError"));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!canVerify) {
      toast.error(t("settings.passkeys.codeInvalid"));
      return;
    }
    setIsVerifyingCode(true);
    try {
      await passkeyAPI.enrollVerifyCode(code);
      setIsStepUpOk(true);
      toast.success(t("settings.passkeys.stepUpOk"));
    } catch (e: any) {
      toast.error(e?.message ?? t("settings.passkeys.codeInvalid"));
      setIsStepUpOk(false);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleCreatePasskey = async () => {
    setIsCreating(true);
    try {
      const { ceremony_id, publicKey } = await passkeyAPI.getRegistrationOptions();
      const credential = await passkeyRegister(publicKey);
      await passkeyAPI.verifyRegistration(ceremony_id, credential);
      toast.success(t("settings.passkeys.created"));
      setCode("");
      setIsStepUpOk(false);
      await load();
    } catch (e: any) {
      if (isPasskeyUserCancelError(e)) return;
      toast.error(e?.message ?? t("settings.passkeys.createError"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (credential_id: string, nextName: string) => {
    const name = nextName.trim();
    if (!name) return;
    try {
      await passkeyAPI.renamePasskey(credential_id, name);
      toast.success(t("settings.passkeys.renamed"));
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? t("settings.passkeys.renameError"));
    }
  };

  const handleDelete = async (credential_id: string) => {
    try {
      await passkeyAPI.deletePasskey(credential_id);
      toast.success(t("settings.passkeys.deleted"));
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? t("settings.passkeys.deleteError"));
    }
  };

  return (
    <div className="border border-border/60 rounded-lg p-8 hover:border-border/80 transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {t("settings.passkeys.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("settings.passkeys.subtitle")}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-md border border-border/60 p-4 space-y-3">
          <div className="text-sm font-medium">{t("settings.passkeys.addTitle")}</div>
          <div className="text-sm text-muted-foreground">{t("settings.passkeys.addHint")}</div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSendCode}
              disabled={isSendingCode}
              className="sm:w-auto transition-all duration-200 hover:bg-primary/10 hover:border-primary/60 hover:text-foreground hover:scale-[1.03] hover:shadow-md disabled:hover:bg-transparent disabled:hover:border-border disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isSendingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("settings.passkeys.sendCode")}
            </Button>

            <div className="flex gap-2 w-full sm:max-w-[420px]">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("settings.passkeys.codePlaceholder")}
                inputMode="numeric"
                maxLength={6}
                className="h-10"
              />
              <Button
                type="button"
                onClick={handleVerifyCode}
                disabled={!canVerify || isVerifyingCode}
                className="transition-all duration-200 hover:bg-primary/90 hover:text-primary-foreground enabled:hover:brightness-110 disabled:hover:bg-primary"
              >
                {isVerifyingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("common.verify")}
              </Button>
            </div>
          </div>

          <Button type="button" onClick={handleCreatePasskey} disabled={!isStepUpOk || isCreating}>
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {t("settings.passkeys.create")}
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="text-sm font-medium">{t("settings.passkeys.listTitle")}</div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("settings.passkeys.empty")}</div>
          ) : (
            <div className="space-y-2">
              {items.map((p) => (
                <PasskeyRow key={p.credential_id} item={p} onRename={handleRename} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PasskeyRow({
  item,
  onRename,
  onDelete,
}: {
  item: PasskeyItem;
  onRename: (credential_id: string, nextName: string) => Promise<void> | void;
  onDelete: (credential_id: string) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hoverRename, setHoverRename] = useState(false);
  const [hoverDelete, setHoverDelete] = useState(false);
  const [name, setName] = useState(item.name ?? "");
  const display = item.name || t("settings.passkeys.unnamed");

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onRename(item.credential_id, trimmed);
    setEditing(false);
  };

  const handleDeleteConfirmed = async () => {
    await onDelete(item.credential_id);
    setConfirmDelete(false);
  };

  const createdLabel = item.created_at
    ? new Date(item.created_at).toLocaleDateString()
    : t("settings.passkeys.unknownDate");
  const lastUsedLabel = item.last_used_at
    ? new Date(item.last_used_at).toLocaleString()
    : t("settings.passkeys.neverUsed");

  return (
    <>
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/70 dark:bg-slate-900/65 px-5 py-4 transition-colors hover:border-border hover:bg-card/80 dark:hover:bg-slate-900/80">
      <div className="min-w-0 space-y-1">
        <div className="truncate text-base font-semibold text-foreground">{display}</div>
        <div className="text-xs text-muted-foreground">
          {t("settings.passkeys.createdAtLabel", { date: createdLabel })}
        </div>
        <div className="text-xs text-muted-foreground">
          {t("settings.passkeys.lastUsedLabel", { date: lastUsedLabel })}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group inline-flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200 hover:scale-110"
          onMouseEnter={() => setHoverRename(true)}
          onMouseLeave={() => setHoverRename(false)}
          aria-label={t("common.rename")}
          title={t("common.rename")}
        >
          <Pencil
            className="h-5 w-5 transition-colors duration-200"
            style={{ color: hoverRename ? "#fde047" : "hsl(var(--muted-foreground))" }}
          />
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="group inline-flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200 hover:scale-110"
          onMouseEnter={() => setHoverDelete(true)}
          onMouseLeave={() => setHoverDelete(false)}
          aria-label={t("common.delete")}
          title={t("common.delete")}
        >
          <Trash2
            className="h-5 w-5 transition-colors duration-200"
            style={{ color: hoverDelete ? "#fde047" : "hsl(var(--muted-foreground))" }}
          />
        </button>
      </div>
    </div>

    <Dialog open={editing} onOpenChange={setEditing}>
      <DialogContent className="max-w-md border border-border/60 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {t("settings.passkeys.renameDialogTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{t("settings.passkeys.renameDialogLabel")}</div>
          <div className="relative">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              className="h-12 pr-20 text-lg"
              maxLength={50}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setName("")}
              className="absolute right-16 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="clear"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {name.length}/50
            </div>
          </div>
          <Button
            type="button"
            onClick={save}
            className="w-full h-10 text-sm font-semibold"
            disabled={!name.trim()}
          >
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("settings.passkeys.deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("settings.passkeys.deleteConfirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid grid-cols-2 gap-3 sm:gap-3 sm:space-x-0">
          <AlertDialogCancel className="mt-0 h-12 w-full border-0 bg-slate-700 text-slate-100 hover:bg-slate-600">
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirmed}
            className="h-12 w-full border-0 bg-yellow-400 text-slate-900 hover:bg-yellow-300"
          >
            {t("settings.passkeys.deleteConfirmAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

