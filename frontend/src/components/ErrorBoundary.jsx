import React from 'react';

/**
 * React 19 错误边界组件
 * 用于捕获和处理组件渲染错误
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // 更新状态以显示错误UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // 记录错误信息
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // 可以在这里添加错误报告逻辑
        if (process.env.NODE_ENV === 'production') {
            // 生产环境下可以发送错误报告
            // reportErrorToService(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 dark:from-black dark:via-purple-950/30 dark:to-black">
                    <div className="text-center space-y-6 p-8">
                        <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                            <span className="text-red-500 text-2xl">⚠️</span>
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">
                                页面出现了一点问题
                            </h1>
                            <p className="text-gray-400 mb-4">
                                Dream Log 遇到了意外错误，我们正在努力修复
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200"
                            >
                                重新尝试
                            </button>

                            <button
                                onClick={() => window.location.href = '/'}
                                className="block px-6 py-2 text-gray-400 hover:text-white transition-colors duration-200"
                            >
                                返回首页
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left bg-red-900/20 p-4 rounded-lg">
                                <summary className="cursor-pointer text-red-400 font-medium mb-2">
                                    错误详情 (仅开发模式显示)
                                </summary>
                                <pre className="text-xs text-red-300 overflow-auto">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
