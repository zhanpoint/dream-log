---
name: shadcn
description: 管理 shadcn 组件与项目——添加、搜索、修复、调试、样式与组合 UI。提供项目上下文、组件文档与用法示例。适用于 shadcn/ui、组件注册表、预设、--preset 代码，或存在 components.json 的项目。也会在「shadcn init」「用 --preset 创建应用」「切换到 --preset」等场景触发。
user-invocable: false
allowed-tools: Bash(npx shadcn@latest *), Bash(pnpm dlx shadcn@latest *), Bash(bunx --bun shadcn@latest *)
---

# shadcn/ui

用于构建 UI、组件与设计体系的框架。组件通过 CLI **以源码形式**加入用户项目。

> **重要：** 所有 CLI 命令须用项目约定的包运行器执行：`npx shadcn@latest`、`pnpm dlx shadcn@latest` 或 `bunx --bun shadcn@latest`——以项目的 `packageManager` 为准。下文示例写 `npx shadcn@latest`，请按项目替换为正确命令。

## 当前项目上下文

```json
!`npx shadcn@latest info --json`
```

上述 JSON 含项目配置与已安装组件。对任意组件可执行 `npx shadcn@latest docs <component>` 获取文档与示例链接。

## 原则

1. **优先用已有组件。** 写自定义 UI 前用 `npx shadcn@latest search` 查注册表；也看社区注册表。  
2. **组合，不要重造。** 设置页 = Tabs + Card + 表单控件；控制台 = Sidebar + Card + Chart + Table。  
3. **先用内置 variant，再写自定义样式。** 如 `variant="outline"`、`size="sm"` 等。  
4. **用语义色。** `bg-primary`、`text-muted-foreground`——不要写死 `bg-blue-500` 这类原始色。  

## 关键规则

以下规则**始终遵守**。每条对应文件中有错误/正确代码对照。

### 样式与 Tailwind → [styling.md](./rules/styling.md)

- **`className` 用于布局，不用于覆盖组件配色或字体。**  
- **不要用 `space-x-*` / `space-y-*`。** 用 `flex` + `gap-*`；纵向堆叠用 `flex flex-col gap-*`。  
- **宽高相等时用 `size-*`。** 写 `size-10`，不要 `w-10 h-10`。  
- **用 `truncate` 简写。** 不要手写 `overflow-hidden text-ellipsis whitespace-nowrap`。  
- **不要手写 `dark:` 覆盖颜色。** 用语义 token（`bg-background`、`text-muted-foreground`）。  
- **条件类名用 `cn()`。** 不要手写模板字符串三元。  
- **不要在遮罩类组件上手动设 `z-index`。** Dialog、Sheet、Popover 等会自行处理层叠。  

### 表单与输入 → [forms.md](./rules/forms.md)

- **表单用 `FieldGroup` + `Field`。** 不要用裸 `div` + `space-y-*` 或 `grid gap-*` 做表单版式。  
- **`InputGroup` 内用 `InputGroupInput` / `InputGroupTextarea`。** 不要在 `InputGroup` 里直接塞裸 `Input` / `Textarea`。  
- **输入框内的按钮用 `InputGroup` + `InputGroupAddon`。**  
- **2～7 个互斥选项用 `ToggleGroup`。** 不要循环 `Button` 手写激活态。  
- **成组 checkbox/radio 用 `FieldSet` + `FieldLegend`。** 不要 `div` + 标题冒充。  
- **校验态：`data-invalid` + `aria-invalid`。** `Field` 上 `data-invalid`，控件上 `aria-invalid`。禁用：`Field` 上 `data-disabled`，控件上 `disabled`。  

### 组件结构 → [composition.md](./rules/composition.md)

- **条目必须放在对应 Group 内。** `SelectItem` → `SelectGroup`；`DropdownMenuItem` → `DropdownMenuGroup`；`CommandItem` → `CommandGroup`。  
- **自定义触发器用 `asChild`（radix）或 `render`（base）。** 以 `npx shadcn@latest info` 的 `base` 字段为准。→ [base-vs-radix.md](./rules/base-vs-radix.md)  
- **Dialog、Sheet、Drawer 必须有标题。** 需要 `DialogTitle` / `SheetTitle` / `DrawerTitle` 以满足无障碍；若视觉隐藏可用 `className="sr-only"`。  
- **完整使用 Card 结构。** `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`，不要全堆在 `CardContent`。  
- **Button 没有 `isPending` / `isLoading`。** 用 `Spinner` + `data-icon` + `disabled` 组合。  
- **`TabsTrigger` 必须在 `TabsList` 内。** 不要直接挂在 `Tabs` 下。  
- **`Avatar` 必须有 `AvatarFallback`。** 图片加载失败时使用。  

### 用组件，不要手写标记 → [composition.md](./rules/composition.md)

- **先查有无组件，再写样式 `div`。**  
- **提示框用 `Alert`。** 不要自定义 div。  
- **空状态用 `Empty`。** 不要手写空状态结构。  
- **Toast 用 `sonner`。** 使用 `sonner` 的 `toast()`。  
- **分隔用 `Separator`**，不要 `<hr>` 或 `<div className="border-t">`。  
- **加载占位用 `Skeleton`。** 不要自定义 `animate-pulse` div。  
- **标签用 `Badge`**，不要自定义 span。  

### 图标 → [icons.md](./rules/icons.md)

- **在 `Button` 里的图标用 `data-icon`。** 如图标上 `data-icon="inline-start"` 或 `data-icon="inline-end"`。  
- **组件内图标不要加尺寸 class。** 由组件 CSS 控制尺寸；不要 `size-4` 或 `w-4 h-4`。  
- **图标以组件/对象传入，不要用字符串 key。** `icon={CheckIcon}`，不要字符串查表。  

### CLI

- **不要手动解析或拉取 preset 代码。** 直接交给 `npx shadcn@latest init --preset <code>`。  

## 关键模式

下列为区分「正确 shadcn/ui 写法」最常见的模式；边界情况见上文链接的规则文件。

```tsx
// 表单：FieldGroup + Field，不要 div + Label
<FieldGroup>
  <Field>
    <FieldLabel htmlFor="email">Email</FieldLabel>
    <Input id="email" />
  </Field>
</FieldGroup>

// 校验：Field 上 data-invalid，控件上 aria-invalid
<Field data-invalid>
  <FieldLabel>Email</FieldLabel>
  <Input aria-invalid />
  <FieldDescription>Invalid email.</FieldDescription>
</Field>

// 按钮内图标：data-icon，不要给图标加尺寸 class
<Button>
  <SearchIcon data-icon="inline-start" />
  Search
</Button>

// 间距：gap-*，不要 space-y-*
<div className="flex flex-col gap-4">  // 正确
<div className="space-y-4">           // 错误

// 等宽高：size-*，不要 w-* h-*
<Avatar className="size-10">   // 正确
<Avatar className="w-10 h-10"> // 错误

// 状态色：Badge variant 或语义 token，不要写死颜色
<Badge variant="secondary">+20.1%</Badge>    // 正确
<span className="text-emerald-600">+20.1%</span> // 错误
```

## 组件选型

| 需求 | 使用 |
| ---- | ---- |
| 按钮/操作 | 合适 variant 的 `Button` |
| 表单输入 | `Input`、`Select`、`Combobox`、`Switch`、`Checkbox`、`RadioGroup`、`Textarea`、`InputOTP`、`Slider` |
| 2～5 项切换 | `ToggleGroup` + `ToggleGroupItem` |
| 数据展示 | `Table`、`Card`、`Badge`、`Avatar` |
| 导航 | `Sidebar`、`NavigationMenu`、`Breadcrumb`、`Tabs`、`Pagination` |
| 浮层 | `Dialog`（模态）、`Sheet`（侧栏）、`Drawer`（底部抽屉）、`AlertDialog`（确认） |
| 反馈 | `sonner`（toast）、`Alert`、`Progress`、`Skeleton`、`Spinner` |
| 命令面板 | `Dialog` 内嵌 `Command` |
| 图表 | `Chart`（封装 Recharts） |
| 布局 | `Card`、`Separator`、`Resizable`、`ScrollArea`、`Accordion`、`Collapsible` |
| 空状态 | `Empty` |
| 菜单 | `DropdownMenu`、`ContextMenu`、`Menubar` |
| 提示/信息 | `Tooltip`、`HoverCard`、`Popover` |

## 上下文字段说明

注入的项目上下文里，这些字段最重要：

- **`aliases`** → 导入路径实际前缀（如 `@/`、`~/`），不要写死。  
- **`isRSC`** → 为 `true` 时，使用 `useState`、`useEffect`、事件或浏览器 API 的组件须在文件顶加 `"use client"`；给建议时务必参考该字段。  
- **`tailwindVersion`** → `"v4"` 用 `@theme inline`；`"v3"` 用 `tailwind.config.js`。  
- **`tailwindCssFile`** → 定义全局 CSS 变量的文件；**只改此文件**，不要新建一份全局样式顶替。  
- **`style`** → 视觉风格（如 `nova`、`vega`）。  
- **`base`** → 底层库（`radix` 或 `base`），影响 API 与可用 props。  
- **`iconLibrary`** → 决定图标包；`lucide` 用 `lucide-react`，`tabler` 用 `@tabler/icons-react` 等，**不要默认全是 lucide-react**。  
- **`resolvedPaths`** → 组件、utils、hooks 等实际落盘路径。  
- **`framework`** → 路由与文件约定（如 Next.js App Router vs Vite SPA）。  
- **`packageManager`** → 安装非 shadcn 依赖时用（如 `pnpm add date-fns` vs `npm install date-fns`）。  

完整字段说明见 [cli.md — `info` 命令](./cli.md)。

## 组件文档、示例与用法

执行 `npx shadcn@latest docs <component>` 可拿到文档、示例与 API 的 URL，再抓取内容。

```bash
npx shadcn@latest docs button dialog select
```

**在创建、修复、调试或使用组件时，应先执行 `npx shadcn@latest docs` 并拉取 URL**，避免凭记忆猜 API。

## 工作流

1. **获取项目上下文** — 上文已注入；需刷新可再跑 `npx shadcn@latest info`。  
2. **先看清已装组件** — 执行 `add` 前，从上下文 `components` 或 `resolvedPaths.ui` 目录确认；不要引用未添加的组件，也不要重复添加已存在的。  
3. **查找组件** — `npx shadcn@latest search`。  
4. **文档与示例** — `npx shadcn@latest docs <component>` 取 URL 后抓取；未安装的注册表项可用 `npx shadcn@latest view` 浏览；预览已安装组件的变更用 `npx shadcn@latest add --diff`。  
5. **安装或更新** — `npx shadcn@latest add`。更新已有组件时先用 `--dry-run` 与 `--diff` 预览（见下文 [更新组件](#更新组件)）。  
6. **修正第三方组件里的 import** — 从社区注册表（如 `@bundui`、`@magicui`）添加后，检查非 UI 文件里写死的 `@/components/ui/...` 等路径是否与项目 alias 一致。用 `npx shadcn@latest info` 取正确的 `ui` 别名（如 `@workspace/ui/components`）并重写 import。CLI 会改写自家 UI 路径，第三方条目可能仍带默认路径。  
7. **审阅新增文件** — 从任意注册表添加组件或 block 后，**务必阅读新增文件并确认无误**：是否缺子组件（如只有 `SelectItem` 没有 `SelectGroup`）、缺 import、组合错误，或违反 [关键规则](#关键规则)。同时按项目 `iconLibrary` 替换图标 import（例如注册表用 `lucide-react` 而项目用 `hugeicons` 时需对调包名与图标名）。修完再往下做。  
8. **注册表须明确** — 用户要加 block/组件时**不要猜注册表**。若未写 `@shadcn`、`@tailark` 等（例如只说「加个登录 block」），要问用哪个注册表；**不要替用户默认**。  
9. **切换 preset** — 先问用户：**重装**、**合并** 还是 **跳过**？  
   - **重装**：`npx shadcn@latest init --preset <code> --force --reinstall`，覆盖全部组件。  
   - **合并**：`npx shadcn@latest init --preset <code> --force --no-reinstall`，再 `npx shadcn@latest info` 列出已装组件，对每个已装组件用 `--dry-run` 与 `--diff` 按 [更新组件](#更新组件) 逐个体合并。  
   - **跳过**：`npx shadcn@latest init --preset <code> --force --no-reinstall`，只更新配置与 CSS，组件不动。  
   - **注意**：preset 命令须在用户项目根目录执行。CLI 会从 `components.json` 保留当前 `base`（`base` vs `radix`）。若必须在临时目录做 `--dry-run` 对比，需显式传 `--base <当前-base>`——preset 代码本身不编码 base。  

## 更新组件

用户要在保留本地改动的同时同步上游时，用 `--dry-run` 与 `--diff` 做智能合并。**禁止手动从 GitHub 拉裸文件——一律用 CLI。**

1. `npx shadcn@latest add <component> --dry-run` 查看将影响的文件。  
2. 对每个文件：`npx shadcn@latest add <component> --diff <file>` 对比上游与本地。  
3. 按 diff 逐文件决策：  
   - 无本地改动 → 可直接覆盖。  
   - 有本地改动 → 读本地文件，分析 diff，在保留本地修改的前提下合入上游。  
   - 用户说「全部按上游」→ 可用 `--overwrite`，但须先确认。  
4. **没有用户明确同意，不要使用 `--overwrite`。**  

## 速查命令

```bash
# 新建项目
npx shadcn@latest init --name my-app --preset base-nova
npx shadcn@latest init --name my-app --preset a2r6bw --template vite

# Monorepo
npx shadcn@latest init --name my-app --preset base-nova --monorepo
npx shadcn@latest init --name my-app --preset base-nova --template next --monorepo

# 已有项目初始化
npx shadcn@latest init --preset base-nova
npx shadcn@latest init --defaults  # 等价于 --template=next --preset=base-nova

# 添加组件
npx shadcn@latest add button card dialog
npx shadcn@latest add @magicui/shimmer-button
npx shadcn@latest add --all

# 添加/更新前预览
npx shadcn@latest add button --dry-run
npx shadcn@latest add button --diff button.tsx
npx shadcn@latest add @acme/form --view button.tsx

# 搜索注册表
npx shadcn@latest search @shadcn -q "sidebar"
npx shadcn@latest search @tailark -q "stats"

# 文档与示例 URL
npx shadcn@latest docs button dialog select

# 查看尚未安装的注册表项
npx shadcn@latest view @shadcn/button
```

**命名 preset：** `base-nova`、`radix-nova`  
**模板：** `next`、`vite`、`start`、`react-router`、`astro`（均可 `--monorepo`）；`laravel` 不支持 monorepo  
**Preset 代码：** 以 `a` 开头的 Base62 字符串（如 `a2r6bw`），来源 [ui.shadcn.com](https://ui.shadcn.com)。  

## 延伸阅读

- [rules/forms.md](./rules/forms.md) — FieldGroup、Field、InputGroup、ToggleGroup、FieldSet、校验态  
- [rules/composition.md](./rules/composition.md) — Group、浮层、Card、Tabs、Avatar、Alert、Empty、Toast、Separator、Skeleton、Badge、Button 加载态  
- [rules/icons.md](./rules/icons.md) — data-icon、图标尺寸、对象传图标  
- [rules/styling.md](./rules/styling.md) — 语义色、variant、className、间距、size、truncate、暗色、cn()、z-index  
- [rules/base-vs-radix.md](./rules/base-vs-radix.md) — asChild vs render，Select、ToggleGroup、Slider、Accordion  
- [cli.md](./cli.md) — 命令、参数、preset、模板  
- [customization.md](./customization.md) — 主题、CSS 变量、扩展组件  
