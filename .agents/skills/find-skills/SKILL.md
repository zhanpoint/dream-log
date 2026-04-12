---
name: find-skills
description: 在用户提出「怎么做 X」「帮我找个做 X 的技能」「有没有能……的技能」或表达想扩展能力时，协助发现与安装代理技能。当用户寻找的功能可能已有可安装技能时应使用本技能。
---

# Find Skills（发现技能）

本技能帮助你在开放的代理技能生态中**发现**并**安装**技能。

## 何时使用本技能

在以下情况使用本技能：

- 用户问「怎么做 X」，而 X 可能是已有现成技能的常见任务  
- 用户说「找个做 X 的技能」「有没有 X 的技能」  
- 用户问「你能做 X 吗」，而 X 属于较专的能力  
- 用户表达想扩展代理能力  
- 用户想搜索工具、模板或工作流  
- 用户提到希望在某领域（设计、测试、部署等）得到帮助  

## 什么是 Skills CLI？

Skills CLI（`npx skills`）是开放代理技能生态的包管理器。技能是以模块化包的形式存在的，通过专门的知识、工作流与工具扩展代理能力。

**常用命令：**

- `npx skills find [query]` — 按关键词或交互方式搜索技能  
- `npx skills add <package>` — 从 GitHub 等来源安装技能  
- `npx skills check` — 检查已安装技能是否有更新  
- `npx skills update` — 更新所有已安装技能  

**浏览技能：** https://skills.sh/

## 如何帮用户找技能

### 第一步：弄清需求

当用户求助时，先明确：

1. **领域**（如 React、测试、设计、部署）  
2. **具体任务**（如写测试、做动效、审 PR）  
3. **是否足够常见**，以至于很可能已有技能  

### 第二步：先看排行榜

在跑 CLI 搜索之前，先查看 [skills.sh 排行榜](https://skills.sh/)，看该领域是否已有知名技能。排行榜按总安装量排序，会突出最流行、经实战检验的选择。

例如，Web 开发方向常见头部技能包括：

- `vercel-labs/agent-skills` — React、Next.js、网页设计等（各 10 万+ 安装）  
- `anthropics/skills` — 前端设计、文档处理等（10 万+ 安装）  

### 第三步：搜索技能

若排行榜无法满足需求，再执行 find：

```bash
npx skills find [query]
```

例如：

- 用户问「怎么让 React 应用更快？」→ `npx skills find react performance`  
- 用户问「能帮我审 PR 吗？」→ `npx skills find pr review`  
- 用户说「我要写 changelog」→ `npx skills find changelog`  

### 第四步：推荐前核实质量

**不要仅凭搜索结果就推荐技能。** 务必核实：

1. **安装量** — 优先 1K+ 安装；低于 100 需谨慎。  
2. **来源可信度** — 官方或知名组织（如 `vercel-labs`、`anthropics`、`microsoft`）通常比匿名作者更可靠。  
3. **GitHub 星标** — 查看来源仓库；星标少于 100 的技能应持保留态度。  

### 第五步：向用户展示选项

找到相关技能后，向用户说明：

1. 技能名称与用途  
2. 安装量与来源  
3. 可执行的安装命令  
4. 在 skills.sh 上进一步了解链接  

示例回复：

```
我找到一个可能用得上的技能：「react-best-practices」提供 Vercel 工程团队的
React 与 Next.js 性能优化指南。
（约 18.5 万次安装）

安装：
npx skills add vercel-labs/agent-skills@react-best-practices

详情：https://skills.sh/vercel-labs/agent-skills/react-best-practices
```

### 第六步：询问是否代为安装

若用户同意继续，可代为安装：

```bash
npx skills add <owner/repo@skill> -g -y
```

`-g` 为全局安装（用户级），`-y` 跳过确认提示。

## 常见技能类别

搜索时可参考下表（示例查询多为英文关键词，与 CLI/站点检索习惯一致）：

| 类别     | 示例查询（关键词）                          |
| -------- | ------------------------------------------- |
| Web 开发 | react, nextjs, typescript, css, tailwind    |
| 测试     | testing, jest, playwright, e2e              |
| DevOps   | deploy, docker, kubernetes, ci-cd           |
| 文档     | docs, readme, changelog, api-docs           |
| 代码质量 | review, lint, refactor, best-practices      |
| 设计     | ui, ux, design-system, accessibility        |
| 效率     | workflow, automation, git                   |

## 高效搜索技巧

1. **关键词要具体**：「react testing」通常比单搜「testing」更好。  
2. **换说法再试**：「deploy」没有结果时，可试「deployment」或「ci-cd」。  
3. **多看热门来源**：许多技能来自 `vercel-labs/agent-skills` 或 `ComposioHQ/awesome-claude-skills`。  

## 找不到技能时

若没有相关技能：

1. 明确告知未找到匹配项  
2. 表示仍可用通用能力直接协助完成任务  
3. 可建议用户自建技能：`npx skills init`  

示例：

```
我搜索了与「xyz」相关的技能，没有匹配结果。
我仍可以直接帮你做这件事，需要我现在开始吗？

若你经常做这类事，可以自建技能：
npx skills init my-xyz-skill
```
