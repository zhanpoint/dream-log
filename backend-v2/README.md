# Dream Log Backend v2 (FastAPI)

这是使用 FastAPI 重写的后端项目，采用现代 Python 工具链。

## 技术栈

- **FastAPI**: 现代、快速的 Web 框架
- **SQLAlchemy 2.0**: 异步 ORM
- **PostgreSQL**: 主数据库
- **Redis**: 缓存和任务队列
- **Celery**: 异步任务处理
- **uv**: 快速的 Python 包管理器
- **Ruff**: 极速的 Python linter 和 formatter
- **mypy**: 静态类型检查

## 项目结构

```
backend-v2/
├── app/              # 主应用目录
│   ├── api/         # API路由
│   ├── core/        # 核心配置（数据库、认证等）
│   ├── models/      # 数据模型（SQLAlchemy）
│   ├── schemas/     # Pydantic模式
│   ├── services/    # 业务逻辑层
│   └── main.py      # FastAPI应用入口
├── scripts/         # 脚本文件
├── .env.example     # 环境变量示例
└── pyproject.toml   # 项目配置
```

## 快速开始

### 1. 安装 uv（如果还没有）

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 2. 创建虚拟环境并安装依赖

```bash
cd backend-v2
uv venv
uv pip install -e .
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入实际配置
```

### 4. 启动开发服务器

```bash
# 方式1: 使用脚本
uv run python scripts/dev.py

# 方式2: 直接使用 uvicorn
uv run uvicorn app.main:app --reload
```

访问 http://localhost:8000 查看 API
访问 http://localhost:8000/docs 查看 Swagger 文档

## 开发工具

### 代码格式化

```bash
uv run ruff format .
```

### 代码检查

```bash
uv run ruff check .
```

### 类型检查

```bash
uv run mypy app
```

### 自动修复

```bash
uv run ruff check --fix .
```

## 数据库迁移

```bash
# 创建迁移
uv run alembic revision --autogenerate -m "描述"

# 执行迁移
uv run alembic upgrade head

# 回滚迁移
uv run alembic downgrade -1
```
