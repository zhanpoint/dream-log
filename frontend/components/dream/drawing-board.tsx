"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Eraser, Palette, Redo2, RotateCcw, Save, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface DrawingBoardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (imageBlob: Blob) => void;
}

interface DrawPoint {
  x: number;
  y: number;
  color: string;
  size: number;
  isEraser: boolean;
}

interface DrawPath {
  points: DrawPoint[];
}

const COLORS = [
  "#000000", // 黑色
  "#FFFFFF", // 白色
  "#EF4444", // 红色
  "#F59E0B", // 橙色
  "#EAB308", // 黄色
  "#22C55E", // 绿色
  "#3B82F6", // 蓝色
  "#8B5CF6", // 紫色
  "#EC4899", // 粉色
];

export function DrawingBoard({ open, onOpenChange, onSave }: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [bgDark, setBgDark] = useState(false);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawPath | null>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { t } = useTranslation();

  // 初始化画布
  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 获取 CSS 尺寸
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // 设置画布实际像素尺寸
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // 缩放上下文以匹配 DPR
    ctx.scale(dpr, dpr);

    // 绘制背景
    ctx.fillStyle = bgDark ? "#1a1a1a" : "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 重绘所有路径
    paths.slice(0, historyIndex + 1).forEach((path) => {
      drawPath(ctx, path);
    });
  }, [open, bgDark, paths, historyIndex]);

  const drawPath = (ctx: CanvasRenderingContext2D, path: DrawPath) => {
    if (path.points.length === 0) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < path.points.length - 1; i++) {
      const point = path.points[i];
      const nextPoint = path.points[i + 1];

      ctx.beginPath();
      ctx.strokeStyle = point.isEraser
        ? bgDark
          ? "#1a1a1a"
          : "#ffffff"
        : point.color;
      ctx.lineWidth = point.size;
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(nextPoint.x, nextPoint.y);
      ctx.stroke();
    }
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // 返回 CSS 像素坐标（相对于画布左上角）
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    const newPath: DrawPath = {
      points: [{ ...coords, color, size: brushSize, isEraser }],
    };
    setCurrentPath(newPath);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !currentPath) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const newPoint: DrawPoint = { ...coords, color, size: brushSize, isEraser };
    const updatedPath = {
      ...currentPath,
      points: [...currentPath.points, newPoint],
    };
    setCurrentPath(updatedPath);

    // 实时绘制
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const lastPoint = currentPath.points[currentPath.points.length - 1];

    ctx.beginPath();
    ctx.strokeStyle = isEraser ? (bgDark ? "#1a1a1a" : "#ffffff") : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentPath) return;

    setIsDrawing(false);
    
    // 添加到历史记录
    const newPaths = [...paths.slice(0, historyIndex + 1), currentPath];
    setPaths(newPaths);
    setHistoryIndex(newPaths.length - 1);
    setCurrentPath(null);
  };

  const handleUndo = () => {
    if (historyIndex > -1) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < paths.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleClear = () => {
    setPaths([]);
    setHistoryIndex(-1);
    setCurrentPath(null);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = bgDark ? "#1a1a1a" : "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
        onOpenChange(false);
      }
    }, "image/png");
  }, [onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{t("dreams.new.drawingBoard")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 px-6 pb-6 overflow-hidden">
          {/* 工具栏 */}
          <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm p-2 rounded-lg border overflow-x-auto">
            {/* 画笔/橡皮擦切换 */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="sm"
                variant={!isEraser ? "default" : "secondary"}
                onClick={() => setIsEraser(false)}
                className="gap-1 h-7 px-2 text-xs transition-all hover:scale-105 hover:-translate-y-0.5 border"
              >
                <Palette className="w-3 h-3" />
                {t("dreams.new.drawingBrush")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isEraser ? "default" : "secondary"}
                onClick={() => setIsEraser(true)}
                className="gap-1 h-7 px-2 text-xs transition-all hover:scale-105 hover:-translate-y-0.5 border"
              >
                <Eraser className="w-3 h-3" />
                {t("dreams.new.drawingEraser")}
              </Button>
            </div>

            {/* 分隔线 */}
            <div className="h-5 w-px bg-border shrink-0" />

            {/* 颜色选择 */}
            {!isEraser && (
              <>
                <div className="flex items-center gap-1.5 shrink-0">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="group relative p-0.5 rounded-full transition-all duration-200"
                      title={c}
                    >
                      {/* 选中指示器外圈 */}
                      {color === c && (
                        <div className="absolute inset-0 rounded-full bg-primary/15" />
                      )}
                      {/* 颜色圆点 */}
                      <div
                        className={cn(
                          "relative w-4 h-4 rounded-full transition-all duration-200 border",
                          color === c 
                            ? "border-primary scale-110 shadow-sm" 
                            : "border-border group-hover:border-primary/60 group-hover:scale-105"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    </button>
                  ))}
                </div>
                <div className="h-5 w-px bg-border shrink-0" />
              </>
            )}

            {/* 画笔粗细 */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-foreground whitespace-nowrap">
                {t("dreams.new.drawingSize")}
              </span>
              <div className="relative w-20">
                <Slider
                  value={[brushSize]}
                  onValueChange={(v) => setBrushSize(v[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="[&_[role=slider]]:w-3.5 [&_[role=slider]]:h-3.5 [&_[role=slider]]:border [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-sm [&_.relative]:h-1.5"
                />
              </div>
              <span className="text-xs font-bold text-foreground w-4 text-center tabular-nums">{brushSize}</span>
            </div>

            {/* 分隔线 */}
            <div className="h-5 w-px bg-border shrink-0" />

            {/* 背景切换 */}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setBgDark(!bgDark)}
              className="h-7 px-2 text-xs shrink-0 transition-all hover:scale-105 hover:-translate-y-0.5 border"
            >
              {bgDark ? t("dreams.new.drawingLightBg") : t("dreams.new.drawingDarkBg")}
            </Button>

            {/* 分隔线 */}
            <div className="h-5 w-px bg-border shrink-0" />

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleUndo}
                disabled={historyIndex < 0}
                title={t("dreams.new.drawingUndo")}
                className="h-7 w-7 p-0 transition-all hover:scale-110 hover:-translate-y-0.5 disabled:hover:scale-100 disabled:hover:translate-y-0 border"
              >
                <Undo2 className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleRedo}
                disabled={historyIndex >= paths.length - 1}
                title={t("dreams.new.drawingRedo")}
                className="h-7 w-7 p-0 transition-all hover:scale-110 hover:-translate-y-0.5 disabled:hover:scale-100 disabled:hover:translate-y-0 border"
              >
                <Redo2 className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleClear}
                title={t("dreams.new.drawingClear")}
                className="h-7 w-7 p-0 transition-all hover:scale-110 hover:-translate-y-0.5 border"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="gap-1 h-7 px-2 text-xs transition-all hover:scale-105 hover:-translate-y-0.5 border"
              >
                <Save className="w-3 h-3" />
                {t("common.save")}
              </Button>
            </div>
          </div>

          {/* 画布 */}
          <div 
            className="flex-1 rounded-lg overflow-hidden border-2" 
            style={{ 
              backgroundColor: bgDark ? "#1a1a1a" : "#ffffff",
              borderColor: bgDark ? "#374151" : "#e5e7eb"
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair touch-none"
              style={{ display: "block" }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
