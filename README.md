# Dream Log

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-%3E%3D3.14-blue.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520%20%28%E6%8E%A8%E8%8D%90_22%2B%29-339933.svg)](https://nodejs.org/)
[![CI](https://github.com/zhanpoint/dream-log/actions/workflows/deploy.yml/badge.svg)](https://github.com/zhanpoint/dream-log/actions/workflows/deploy.yml)
[![GitHub stars](https://img.shields.io/github/stars/zhanpoint/dream-log?style=social)](https://github.com/zhanpoint/dream-log)

> **一句话**：AI 辅助的梦境记录与解读全栈应用——低门槛记录、结构化分析、长期主题洞察与社区交流。  
> *English:* Full-stack dream journal with AI analysis; **Next.js** + **FastAPI** + **PostgreSQL (pgvector)** + **Redis** + **arq**.

**仓库：** [github.com/zhanpoint/dream-log](https://github.com/zhanpoint/dream-log)

---

## 📖 项目简介

许多人想记梦却难以坚持，记下来的内容又散落各处、难以回顾。Dream Log 把「写下来」和「看得懂」放在一起：支持文字、语音、图片与手绘等多种记录方式，由后台异步任务调用大模型生成解读与洞察，并通过时间线与主题帮助你观察长期规律。

**适合谁？**

- 希望**系统记录梦境**、减少遗忘的个人用户  
- 关注**情绪与主题变化**、愿意长期使用的日记型用户  
- 需要参考本仓库做**类似 AI + 日记 / 社区类产品**的全栈开发者  

> **重要说明**：AI 解读仅供反思与娱乐参考，**不能替代**医疗或心理咨询专业意见。

---

## ✨ 主要特性

- 多模态记录：文字、语音转写、图片、画板等  
- AI 解读与洞察：OpenRouter 等多模型、可配置分阶段分析  
- 账户与安全：JWT、Refresh Token、Passkey、Google OAuth  
- 可选计费：Stripe（可用 `BILLING_DISABLED` 关闭入口）  
- 社区与探索、国际化（i18n）、SSE 等实时状态推送  
- 前端：Next.js App Router、React 19、Tailwind v4、Radix / shadcn 模式  
- 部署：Docker Compose、GitHub Actions（`deploy.yml`）

---

## 🚀 快速开始

**依赖：** Python **≥ 3.14** · Node **≥ 20**（推荐 22）· PostgreSQL（建议 **pgvector**）· Redis **7** · 后端推荐 **[uv](https://github.com/astral-sh/uv)**

```bash
git clone https://github.com/zhanpoint/dream-log.git
cd dream-log
```

**后端**

```bash
cd backend
cp .env.example .env   # 填写 DATABASE_URL、REDIS_URL、SECRET_KEY、JWT_SECRET_KEY、OPENROUTER_API_KEY 等

uv pip install -e ".[dev]"
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

**Worker**（另开终端；AI 等后台任务依赖）

```bash
cd backend
uv run arq app.core.arq_app.WorkerSettings
```

**前端**

```bash
cd frontend
# 新建 .env.local：NEXT_PUBLIC_API_URL=http://localhost:8000
npm install && npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)；API 文档 [http://localhost:8000/docs](http://localhost:8000/docs)。

**健康检查：** `curl -s http://localhost:8000/health`

**Docker Compose：** 见根目录 `docker-compose.yml` 与 `.env.example`（需配置镜像与环境变量）。

---

## 📚 使用说明

- **HTTP API**：业务路由在 `/api` 下，完整契约以 **OpenAPI** 为准 → `http://localhost:8000/docs` / `redoc`。  
- **前端调用**：`frontend/lib/api.ts` 与各 `*-api.ts`（Token 刷新、缓存、`Accept-Language` 等）。  
- **工程约定**：`frontend/README.md`、`backend/README.md`；梦境 UI 说明见 `frontend/components/dream/README.md`。

```bash
curl -s http://localhost:8000/health
curl -s -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:8000/api/dreams
```

---

## 🗂️ 目录结构

```text
.
├── backend/app/          # FastAPI：api / core / models / schemas / services / tasks
├── backend/alembic/      # 数据库迁移
├── frontend/app/         # Next.js 页面与路由
├── frontend/components/  # UI 与业务组件
├── frontend/lib/         # API 客户端与工具
├── nginx/
├── docker-compose.yml
├── .github/workflows/
├── LICENSE
└── README.md
```

---

## ⚙️ 配置

| 文件 | 用途 |
|------|------|
| `backend/.env.example` | 本地后端：数据库、Redis、JWT、AI、OSS、语音、Stripe 等（**以文件内注释为准**） |
| `.env.example` | Docker Compose / 部署编排变量 |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` → 后端根地址 |

勿将含密钥的 `.env` 提交到 Git；生产环境用平台密钥注入。

---

## ❓ 常见问题

1. **AI 一直 pending** → 是否已启动 **arq Worker**？Redis 与 `DATABASE_URL` 是否可达？  
2. **跨域 / 401** → 检查 `ALLOWED_ORIGINS` 与 `NEXT_PUBLIC_API_URL`。  
3. **迁移失败** → `DATABASE_URL` 与 PG 版本/pgvector；在 `backend` 下执行 `uv run alembic upgrade head`。  
4. **语音转写** → 配置 `VOICE_TRANSCRIBE_PROVIDER` 及对应云厂商密钥（见 `backend/.env.example`）。  
5. **Stripe 调试** → 配置沙箱 Key/Webhook，或 `BILLING_DISABLED=true`。

---

## 🤝 参与贡献

欢迎 **Issue** 与 **PR**：请说明复现步骤与环境（OS、Python/Node 版本）；PR 保持单一主题，后端逻辑放在 `services/`，提交前运行后端 `ruff`/`mypy`、前端 `eslint`/`tsc`，数据库变更附带 Alembic 说明。

问题与交流：请使用 [GitHub Issues](https://github.com/zhanpoint/dream-log/issues)。

---

## 📄 许可证

本项目采用 **MIT License**，详见仓库根目录 [`LICENSE`](./LICENSE)。

---

## 🙏 致谢

感谢 **FastAPI**、**Next.js**、**React**、**SQLAlchemy**、**arq**、**Redis** 及 **Radix UI**、**Tailwind CSS** 等开源项目。
