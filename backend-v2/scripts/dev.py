"""
开发服务器启动脚本
"""
import warnings
import uvicorn

# 过滤 oss2 库的 SyntaxWarning
warnings.filterwarnings("ignore", category=SyntaxWarning, module="oss2")


def main():
    """主函数"""
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # 开启热重载
        log_level="info",
    )


if __name__ == "__main__":
    main()
