import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { Textarea } from './textarea';
import { Label } from './label';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import contactService from '../../services/contactService';

/**
 * 反馈建议模态框组件 - 简化版
 * @param {Object} props
 * @param {boolean} props.open - 是否打开模态框
 * @param {function} props.onOpenChange - 开关状态变化回调
 */
export function FeedbackModal({ open, onOpenChange }) {
    const { isAuthenticated, user } = useAuth();
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 重置表单
    const resetForm = () => {
        setMessage('');
        setErrors({});
        setIsSubmitting(false);
    };

    // 表单验证
    const validateForm = () => {
        const newErrors = {};

        if (!message.trim()) {
            newErrors.message = '内容不能为空';
        } else if (message.length > 2000) {
            newErrors.message = '内容长度不能超过2000个字符';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 提交表单
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isAuthenticated) {
            toast.error('请先登录后再提交反馈建议');
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await contactService.submitFeedback(message);

            if (result.success) {
                toast.success(result.message);
                resetForm();
                onOpenChange(false);
            } else {
                if (result.errors && Object.keys(result.errors).length > 0) {
                    setErrors(result.errors);
                }
                toast.error(result.message);
            }
        } catch (error) {
            console.error('提交失败:', error);
            toast.error('提交失败，请稍后重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 关闭模态框时重置表单
    const handleOpenChange = (isOpen) => {
        if (!isOpen) {
            resetForm();
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-center">反馈建议</DialogTitle>
                    <DialogDescription className="text-center text-sm text-muted-foreground">
                        您的意见和建议对我们非常宝贵，请分享您的想法，帮助我们改进产品体验
                    </DialogDescription>
                </DialogHeader>

                {!isAuthenticated ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">请先登录后再提交反馈建议</p>
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>
                            确定
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 内容 */}
                        <div className="space-y-2">
                            <Label htmlFor="message">建议内容 <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="message"
                                placeholder="请分享您的建议和想法。例如：希望新增的功能、界面改进建议、使用体验反馈、发现的bug或问题等..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className={`min-h-[150px] max-h-[300px] resize-y ${errors.message ? 'border-red-500 focus:border-red-500' : ''}`}
                                maxLength={2000}
                            />
                            <div className="flex justify-between items-center">
                                {errors.message && (
                                    <p className="text-sm text-red-500">{errors.message}</p>
                                )}
                                <p className="text-xs text-muted-foreground ml-auto">
                                    {message.length}/2000
                                </p>
                            </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                取消
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="min-w-[80px]"
                            >
                                {isSubmitting ? '提交中...' : '提交'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}