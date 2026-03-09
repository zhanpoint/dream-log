"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { getCroppedImg } from "@/lib/utils";
import { userAPI } from "@/lib/user-api";
import { AuthUser } from "@/lib/auth-api";
import { toast } from "sonner";
import { useTranslation } from "@/node_modules/react-i18next";
import { Loader2 } from "lucide-react";

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AvatarUploadModal({
  isOpen,
  onClose,
}: AvatarUploadModalProps) {
  const { t } = useTranslation();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("settings.avatar.fileTooLarge"));
      return;
    }

    // 检查文件类型 - 支持 JPG、PNG、WebP
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      toast.error(t("settings.avatar.invalidFormat"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    try {
      // 1. 裁剪图片
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      // 2. 获取上传签名
      const signature = await userAPI.getAvatarUploadSignature(
        `avatar_${Date.now()}.jpg`,
        "image/jpeg"
      );

      // 3. 上传到 OSS
      await userAPI.uploadToOSS(
        signature.upload_url,
        croppedBlob,
        "image/jpeg"
      );

      // 4. 更新数据库
      const updatedUser = await userAPI.updateAvatar(signature.access_url);

      // 5. 更新本地存储（会自动触发 auth:user-updated 事件）
      AuthUser.set(updatedUser);

      toast.success(t("settings.avatar.uploadSuccess"));
      handleClose();
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast.error(error.message || t("settings.avatar.uploadError"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.avatar.uploadTitle")}</DialogTitle>
          <DialogDescription>
            {t("settings.avatar.uploadDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!imageSrc ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {t("settings.avatar.dragAndDrop")}
              </p>
              <label htmlFor="avatar-upload">
                <Button asChild className="border border-input bg-background text-foreground hover:bg-muted/80 hover:border-primary/60 hover:scale-105 transition-all duration-200">
                  <span>{t("settings.avatar.selectImage")}</span>
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          ) : (
            <>
              <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("settings.avatar.zoom")}
                </label>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={([value]) => setZoom(value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose} disabled={isUploading} className="border border-input bg-background text-foreground hover:bg-muted/80 hover:border-primary/60 hover:scale-105 transition-all duration-200">
            {t("common.cancel")}
          </Button>
          {imageSrc && (
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? t("settings.avatar.uploading") : t("common.save")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
