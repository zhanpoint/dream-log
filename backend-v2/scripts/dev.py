"""
开发服务器启动脚本
"""
import uvicorn


def main():
    """主函数"""
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
