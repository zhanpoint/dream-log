import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * 编辑器错误边界组件
 * 专门用于捕获编辑器相关的错误，提供优雅的降级体验
 */
class EditorErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // 更新 state 使下一次渲染能够显示降级后的 UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // 记录错误信息，用于调试
        console.error('编辑器错误边界捕获到错误:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });

        // 这里可以将错误信息发送到错误报告服务
        // 例如：logErrorToService(error, errorInfo);
    }

    handleReload = () => {
        // 重置错误状态
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    handleRefreshPage = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Card className="w-full max-w-md mx-auto mt-8">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-destructive">
                            编辑器加载失败
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                            富文本编辑器暂时无法加载，这可能是由于网络问题或浏览器兼容性问题导致的。
                        </p>

                        <div className="flex flex-col space-y-2">
                            <Button
                                onClick={this.handleReload}
                                variant="default"
                                className="w-full"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                重试加载编辑器
                            </Button>

                            <Button
                                onClick={this.handleRefreshPage}
                                variant="outline"
                                className="w-full"
                            >
                                刷新页面
                            </Button>
                        </div>

                        {/* 开发环境下显示详细错误信息 */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-4 p-2 bg-muted rounded text-xs">
                                <summary className="cursor-pointer font-medium">
                                    错误详情（开发模式）
                                </summary>
                                <pre className="mt-2 whitespace-pre-wrap">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}

export default EditorErrorBoundary;
