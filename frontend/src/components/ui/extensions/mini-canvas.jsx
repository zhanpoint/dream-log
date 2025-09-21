import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useI18nContext } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/ui';
import { Save, X, Undo, Redo, Eraser } from 'lucide-react';

const MiniCanvas = ({ onComplete, onCancel }) => {
    const { t } = useI18nContext();
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');

    const canvasSizes = [
        { width: 600, height: 400, label: t('canvas.sizeSmall', '小 (600x400)') },
        { width: 800, height: 600, label: t('canvas.sizeMedium', '中 (800x600)') },
        { width: 1000, height: 700, label: t('canvas.sizeLarge', '大 (1000x700)') },
    ];

    const colorPalette = ['#000000', '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6'];
    const backgroundPalette = ['#FFFFFF', '#F2F2F7', '#1C1C1E', '#2C2C2E', '#000000'];

    const getCoords = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const initializeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true }); // <--- 添加 willReadFrequently
        const { width, height } = canvasSize;
        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Save initial state for undo
        const initialImageData = ctx.getImageData(0, 0, width, height);
        setHistory([initialImageData]);
        setHistoryIndex(0);
    }, [canvasSize, backgroundColor]);


    useEffect(() => {
        initializeCanvas();
    }, [initializeCanvas]);

    const saveState = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const startDrawing = (e) => {
        e.preventDefault();
        const { x, y } = getCoords(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(x, y); // Draw a point for single click
        ctx.stroke();
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.closePath();
        setIsDrawing(false);
        saveState();
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(history[newIndex], 0, 0);
        }
    };

    const clearCanvas = () => {
        if (window.confirm(t('canvas.clearConfirm', '您确定要清空画板吗？所有未保存的进度都将丢失。'))) {
            initializeCanvas();
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(history[newIndex], 0, 0);
        }
    };

    const handleComplete = () => {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL('image/png');
        onComplete(dataUrl);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onCancel();
            }
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    undo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onCancel, undo, redo]);

    return createPortal(
        <div className="mini-canvas-overlay" onClick={onCancel}>
            <div className="mini-canvas-modal" onClick={(e) => e.stopPropagation()}>
                <div className="mini-canvas-header">
                    <h3>{t('canvas.title', '梦境画板')}</h3>
                    <Button variant="ghost" size="sm" onClick={onCancel} className="mini-canvas-close">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="mini-canvas-toolbar">
                    <div className="mini-canvas-tool-group">
                        <span className="mini-canvas-label">{t('canvas.brushColor', '画笔颜色:')}</span>
                        <div className="mini-canvas-color-palette">
                            {colorPalette.map(c => (
                                <button
                                    key={c}
                                    className={cn('mini-canvas-color-swatch', color === c && 'mini-canvas-color-active')}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                    title={`${t('canvas.brushColorTitle', '画笔颜色:')} ${c}`}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="mini-canvas-tool-group">
                        <span className="mini-canvas-label">{t('canvas.brushSize', '画笔大小:')}</span>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={brushSize}
                            onChange={(e) => setBrushSize(e.target.value)}
                            className="mini-canvas-slider"
                            title={`${t('canvas.brushSizeTitle', '画笔大小:')} ${brushSize}`}
                        />
                        <span className="mini-canvas-size-display">{brushSize}</span>
                    </div>
                    <div className="mini-canvas-tool-group">
                        <span className="mini-canvas-label">{t('canvas.canvasBackground', '画布背景:')}</span>
                        <div className="mini-canvas-background-palette">
                            {backgroundPalette.map(bg => (
                                <button
                                    key={bg}
                                    className={cn('mini-canvas-background-swatch', backgroundColor === bg && 'mini-canvas-background-active')}
                                    style={{ backgroundColor: bg }}
                                    onClick={() => {
                                        setBackgroundColor(bg);
                                        // Re-initialize canvas with new background
                                        const canvas = canvasRef.current;
                                        const ctx = canvas.getContext('2d');
                                        ctx.fillStyle = bg;
                                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                                        saveState();
                                    }}
                                    title={`${t('canvas.backgroundColorTitle', '背景颜色:')} ${bg}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div ref={containerRef} className="mini-canvas-container">
                    <canvas
                        ref={canvasRef}
                        className="mini-canvas"
                        style={{
                            width: `${canvasSize.width}px`,
                            height: `${canvasSize.height}px`,
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            backgroundColor: backgroundColor,
                        }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>

                <div className="mini-canvas-footer">
                    <div className="flex items-center gap-2">
                        <span className="mini-canvas-label">{t('canvas.canvasSize', '画布尺寸:')}</span>
                        <div className="flex gap-1">
                            {canvasSizes.map(size => (
                                <Button
                                    key={size.label}
                                    variant={canvasSize.width === size.width ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setCanvasSize(size)}
                                >
                                    {size.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={clearCanvas} title={t('canvas.clearCanvas', '清空画板')}>
                            <Eraser className="w-4 h-4 mr-1" />
                            {t('canvas.clear', '清空')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0} title={t('canvas.undo', '撤销 (Ctrl+Z)')}>
                            <Undo className="w-4 h-4 mr-1" />
                            {t('canvas.undo', '撤销')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1} title={t('canvas.redo', '重做 (Ctrl+Y)')}>
                            <Redo className="w-4 h-4 mr-1" />
                            {t('canvas.redo', '重做')}
                        </Button>
                        <Button onClick={handleComplete} className="mini-canvas-complete">
                            <Save className="w-4 h-4 mr-2" />
                            {t('canvas.completeAndInsert', '完成并插入')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export { MiniCanvas }; 