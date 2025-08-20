import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';
import { ResizableTextarea } from './resizable-textarea';

// Enhanced Resizable Textarea with Traditional Label
const EnhancedResizableTextarea = forwardRef(({
    id,
    label,
    icon: Icon,
    className,
    required,
    optional,
    minHeight = 120,
    maxHeight = 600,
    defaultHeight = 120,
    ...props
}, ref) => {
    // 如果提供了label，显示传统的标签布局
    if (label) {
        return (
            <div className="enhanced-input-wrapper">
                <Label htmlFor={id} className="enhanced-label">
                    {Icon && <Icon className="w-4 h-4" />}
                    {label}
                    {required && <span className="required-star">*</span>}
                    {optional && <span className="optional-text">(可选)</span>}
                </Label>
                <ResizableTextarea
                    ref={ref}
                    id={id}
                    className={cn('enhanced-textarea', className)}
                    minHeight={minHeight}
                    maxHeight={maxHeight}
                    defaultHeight={defaultHeight}
                    {...props}
                />
            </div>
        );
    }

    // 否则，只显示文本框（用于标题在卡片标题中显示的情况）
    return (
        <ResizableTextarea
            ref={ref}
            id={id}
            className={cn('enhanced-textarea', className)}
            minHeight={minHeight}
            maxHeight={maxHeight}
            defaultHeight={defaultHeight}
            {...props}
        />
    );
});

EnhancedResizableTextarea.displayName = 'EnhancedResizableTextarea';

export { EnhancedResizableTextarea };