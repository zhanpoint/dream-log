---
name: framework-selection
description: "在任何 LangChain/LangGraph/Deep Agents 项目开始时、编写任何代理代码前，先调用本技能。用于判断当前任务应选用哪一层框架：LangChain、LangGraph、Deep Agents，或组合使用。必须先于其他代理技能进行评估。"
---

<overview>
LangChain、LangGraph 与 Deep Agents 是**分层关系**，不是互斥选项。每一层都建立在下一层之上：

```
┌─────────────────────────────────────────┐
│              Deep Agents                │  ← 最高层：开箱即用能力更完整
│        （规划、记忆、技能、文件）         │
├─────────────────────────────────────────┤
│               LangGraph                 │  ← 编排层：图、循环、状态
│        （节点、边、状态、持久化）         │
├─────────────────────────────────────────┤
│               LangChain                 │  ← 基础层：模型、工具、链
│       （模型、工具、提示词、RAG）         │
└─────────────────────────────────────────┘
```

选择更高层并不会切断你对下层能力的使用：你可以在 Deep Agents 中嵌入 LangGraph 图，也可以在两者中都使用 LangChain 原语。

> **在任何项目中，务必先加载本技能，再选其他技能或编写代理代码。** 因为你选择的框架会决定下一步该调用哪些技能。
</overview>

---

## 决策指南

<decision-table>

按顺序回答以下问题：

| 问题 | 是 → | 否 → |
|----------|-------|-------|
| 任务是否需要：拆分子任务、跨长会话管理文件、持久记忆、按需加载技能？ | **Deep Agents** | ↓ |
| 任务是否需要复杂控制流：循环、动态分支、并行 worker、人工审核（HITL）、自定义状态？ | **LangGraph** | ↓ |
| 是否是单一目的代理：接收输入、调用工具、返回结果？ | **LangChain** (`create_agent`) | ↓ |
| 是否只是纯模型调用 / 链 / 检索流水线（无代理循环）？ | **LangChain**（chain） | — |

</decision-table>

---

## 框架画像

<langchain-profile>

### LangChain — 适合任务聚焦、边界清晰的场景

**最适合：**
- 使用固定工具集的单一目的代理
- RAG 流水线与文档问答
- 模型调用、提示模板、输出解析
- 代理逻辑简单的快速原型

**不适合：**
- 代理需要跨多步骤自主规划
- 需要跨多会话持久化状态
- 控制流包含复杂条件或迭代

**下一步建议调用技能：** `langchain-models`、`langchain-rag`、`langchain-middleware`

</langchain-profile>

<langgraph-profile>

### LangGraph — 适合需要完全掌控控制流的场景

**最适合：**
- 带分支逻辑或循环的代理（如“重试直到正确”、反思循环）
- 路径依赖中间结果的多步骤工作流
- 在特定步骤需要人工审批（HITL）
- 并行 fan-out / fan-in（map-reduce 模式）
- 在同一会话多次调用间保持持久状态

**不适合：**
- 你希望“规划、文件管理、子代理委派”都由框架托管（此时应选 Deep Agents）
- 工作流足够简单，用普通代理就能解决

**下一步建议调用技能：** `langgraph-fundamentals`、`langgraph-human-in-the-loop`、`langgraph-persistence`

</langgraph-profile>

<deep-agents-profile>

### Deep Agents — 适合开放式、维度多、周期长的任务

**最适合：**
- 长周期任务，需要拆解为 todo 列表推进
- 代理需要在会话中读写并管理文件
- 将子任务委派给专门子代理
- 按需加载领域技能
- 跨多会话保留长期记忆

**不适合：**
- 任务简单，单一代理即可完成
- 你需要对每条图边进行精细手工控制（应直接使用 LangGraph）

**中间件（Middleware）— 内置且可扩展：**

Deep Agents 开箱自带中间件层——你主要做配置，而非从零实现。下列能力默认已接好，也可继续叠加自定义中间件：

| 中间件 | 提供能力 | 默认开启？ |
|------------|-----------------|------------|
| `TodoListMiddleware` | `write_todos` 工具——规划并跟踪多步骤任务 | ✓ |
| `FilesystemMiddleware` | `ls`、`read_file`、`write_file`、`edit_file`、`glob`、`grep` 工具 | ✓ |
| `SubAgentMiddleware` | `task` 工具——将工作委派给命名子代理 | ✓ |
| `SkillsMiddleware` | 从技能目录按需加载 `SKILL.md` | 可选 |
| `MemoryMiddleware` | 通过 `Store` 实例实现跨会话长期记忆 | 可选 |
| `HumanInTheLoopMiddleware` | 敏感工具调用前中断并请求人工审批 | 可选 |

**下一步建议调用技能：** `deep-agents-core`、`deep-agents-memory`、`deep-agents-orchestration`

</deep-agents-profile>

---

## 分层混用

<mixing-layers>
由于框架是分层的，因此可以在同一个项目中组合使用。最常见模式是：用 Deep Agents 做顶层编排，再在特定子任务下沉到 LangGraph。

### 何时混用

| 场景 | 推荐模式 |
|----------|---------------------|
| 主代理需要规划 + 记忆，但某个子任务需要精细图控制 | Deep Agents 编排器 → LangGraph 子代理 |
| 专项流水线（如 RAG、反思循环）由更大代理体系调用 | 将 LangGraph 图封装为工具或子代理 |
| 顶层协同 + 某垂直领域的底层图控制 | Deep Agents + LangGraph 编译图（作为子代理） |

### 实际工作方式

LangGraph 编译后的图可以注册为 Deep Agents 中的子代理。这意味着你可以先构建一个强控制的 LangGraph 工作流（例如“检索-校验”循环），再通过 Deep Agents 的 `task` 工具把它作为命名子代理交出去——Deep Agents 编排器无需关心其内部图结构即可完成委派。

LangChain 的工具、链与检索器可以自由用于 LangGraph 节点和 Deep Agents 工具中——它们是各层通用的基础积木。

</mixing-layers>

---

## 速查表

<quick-reference>

| | LangChain | LangGraph | Deep Agents |
|---|-----------|-----------|-------------|
| **控制流** | 固定（工具循环） | 自定义（图） | 托管（中间件） |
| **中间件层** | 仅回调（callbacks） | ✗ 无 | ✓ 显式、可配置 |
| **规划能力** | ✗ | 手动实现 | ✓ TodoListMiddleware |
| **文件管理** | ✗ | 手动实现 | ✓ FilesystemMiddleware |
| **持久记忆** | ✗ | 借助 checkpointer | ✓ MemoryMiddleware |
| **子代理委派** | ✗ | 手动实现 | ✓ SubAgentMiddleware |
| **按需技能加载** | ✗ | ✗ | ✓ SkillsMiddleware |
| **人工介入（HITL）** | ✗ | 手动中断 | ✓ HumanInTheLoopMiddleware |
| **自定义图边控制** | ✗ | ✓ 完全控制 | 有限 |
| **上手复杂度** | 低 | 中 | 低 |
| **灵活性** | 中 | 高 | 中 |

> **Middleware 这一概念主要对应 LangChain（callbacks）与 Deep Agents（显式中间件层）。LangGraph 没有独立中间件层——行为直接编排在节点与边上。**

</quick-reference>
