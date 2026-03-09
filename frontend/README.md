# Dream Log Frontend v2 (Next.js)

这是使用 Next.js 15 重写的前端项目。

## 技术栈

- **Next.js 15**: React 框架（App Router）
- **React 19**: UI 库
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **Radix UI**: 无障碍 UI 组件
- **Axios**: HTTP 客户端
- **React Hook Form**: 表单管理
- **Zod**: 数据验证
- **next-themes**: 主题切换

## 项目结构

```
frontend-v2/
├── app/              # Next.js App Router
│   ├── globals.css   # 全局样式
│   ├── layout.tsx    # 根布局
│   └── page.tsx      # 首页
├── components/       # React 组件
│   └── theme-provider.tsx
├── lib/              # 工具函数和配置
│   ├── utils.ts      # 工具函数
│   └── api.ts        # API 客户端
├── public/           # 静态资源
├── styles/           # 额外样式
├── next.config.ts    # Next.js 配置
├── tailwind.config.ts # Tailwind 配置
└── tsconfig.json     # TypeScript 配置
```

## 快速开始

### 1. 安装依赖

```bash
cd frontend-v2
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置 API 地址
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

## 功能特性

- ✅ TypeScript 类型安全
- ✅ Tailwind CSS 样式系统
- ✅ 深色模式支持
- ✅ Radix UI 无障碍组件
- ✅ Axios API 客户端（自动 JWT 管理）
- ✅ React Hook Form 表单验证
- ✅ 响应式设计

## API 集成

API 客户端已配置在 `lib/api.ts`，自动处理：
- JWT Token 自动注入
- Token 过期自动跳转登录
- 统一错误处理

使用示例：
```typescript
import { api } from "@/lib/api";

// GET 请求
const { data } = await api.get("/users");

// POST 请求
const { data } = await api.post("/users", { username: "test" });
```
