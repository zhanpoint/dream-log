"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DreamApi } from "@/lib/dream-api";

export default function DataManagementPage() {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAllDreams = async () => {
    setDeleting(true);
    try {
      await DreamApi.deleteAll();
      toast.success(t("settings.data.deleteAllDreamsSuccess"));
    } catch {
      toast.error(t("settings.data.deleteAllDreamsFailed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.data.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings.data.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            {t("settings.data.deleteAllDreamsTitle")}
          </CardTitle>
          <CardDescription>{t("settings.data.deleteAllDreamsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={deleting}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800 transition-all min-w-[140px]"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("settings.data.deleteAllDreamsTitle")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settings.data.deleteAllDreamsTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.data.deleteAllDreamsConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllDreams}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("common.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

