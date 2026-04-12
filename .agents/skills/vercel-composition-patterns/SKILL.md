---
name: vercel-composition-patterns
description:
  可规模化的 React 组合模式。在重构「布尔 props 泛滥」的组件、构建灵活的组件库或设计可复用 API 时使用。涉及复合组件、render props、Context Provider
  或组件架构的任务应触发本技能。包含 React 19 API 变更说明。
license: MIT
metadata:
  author: vercel
  version: '1.0.0'
---

# React 组合模式

用于构建**灵活、可维护**的 React 组件的组合模式。通过**复合组件**、**状态提升**与**内部组合**来避免布尔 props 泛滥。随项目变大，这些模式让人类与 AI 代理都更容易协作。

## 何时采用

在以下场景参考本指南：

- 重构带有大量布尔 props 的组件  
- 构建可复用的组件库  
- 设计灵活的组件 API  
- 审查组件架构  
- 使用复合组件或 Context Provider  

## 按优先级划分的规则类别

| 优先级 | 类别 | 影响 | 前缀 |
| ------ | ---- | ---- | ---- |
| 1 | 组件架构 | 高 | `architecture-` |
| 2 | 状态管理 | 中 | `state-` |
| 3 | 实现模式 | 中 | `patterns-` |
| 4 | React 19 API | 中 | `react19-` |

## 速查

### 1. 组件架构（高）

- `architecture-avoid-boolean-props` — 不要用布尔 props 堆砌行为差异；用**组合**表达  
- `architecture-compound-components` — 用共享 context 组织复杂复合组件  

### 2. 状态管理（中）

- `state-decouple-implementation` — **只有 Provider** 知道状态具体如何管理  
- `state-context-interface` — 为依赖注入定义通用接口（state、actions、meta 等）  
- `state-lift-state` — 将状态放进 Provider，供兄弟子树访问  

### 3. 实现模式（中）

- `patterns-explicit-variants` — 用**显式变体组件**代替一堆布尔「模式」开关  
- `patterns-children-over-render-props` — 组合优先用 **children**，而不是 `renderX` 类 render props  

### 4. React 19 API（中）

> **⚠️ 仅适用于 React 19+。** 若使用 React 18 或更早版本，可跳过本节。

- `react19-no-forwardref` — 不要使用 `forwardRef`；读取 context 时用 `use()` 替代 `useContext()`  

## 如何使用

阅读各规则文件的详解与代码示例：

```
rules/architecture-avoid-boolean-props.md
rules/state-context-interface.md
```

每个规则文件通常包含：

- 为何重要（简要说明）  
- 错误写法示例与解释  
- 正确写法示例与解释  
- 补充上下文与参考链接  

## 完整汇编文档

展开全部规则的完整指南见：`AGENTS.md`
