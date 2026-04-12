---
name: vercel-react-best-practices
description: Vercel 工程团队的 React 与 Next.js 性能优化指南。在编写、审查或重构 React/Next.js 代码时应使用本技能，以落实高性能模式。适用于涉及 React 组件、Next.js 页面、数据获取、打包体积或性能优化的任务。
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# Vercel React 最佳实践

面向 React 与 Next.js 应用的性能优化综合指南，由 Vercel 维护。共 **69** 条规则，分 **8** 大类，按影响优先级排序，用于指导自动重构与代码生成。

## 何时采用

在以下场景参考本指南：

- 编写新的 React 组件或 Next.js 页面  
- 实现数据获取（客户端或服务端）  
- 审查代码中的性能问题  
- 重构现有 React/Next.js 代码  
- 优化打包体积或加载时间  

## 按优先级划分的规则类别

| 优先级 | 类别 | 影响 | 前缀 |
|--------|------|------|------|
| 1 | 消除请求瀑布流 | 关键 | `async-` |
| 2 | 打包体积优化 | 关键 | `bundle-` |
| 3 | 服务端性能 | 高 | `server-` |
| 4 | 客户端数据获取 | 中高 | `client-` |
| 5 | 重渲染优化 | 中 | `rerender-` |
| 6 | 渲染性能 | 中 | `rendering-` |
| 7 | JavaScript 性能 | 低–中 | `js-` |
| 8 | 进阶模式 | 低 | `advanced-` |

## 速查

### 1. 消除瀑布流（关键）

- `async-cheap-condition-before-await` — 在 await 标记或远程值之前，先判断廉价的同步条件  
- `async-defer-await` — 将 await 挪到实际使用它的分支里  
- `async-parallel` — 无依赖操作用 `Promise.all()` 并行  
- `async-dependencies` — 部分依赖场景用 better-all  
- `async-api-routes` — API 路由里尽早启动 Promise、靠后再 await  
- `async-suspense-boundaries` — 用 Suspense 流式输出内容  

### 2. 打包体积优化（关键）

- `bundle-barrel-imports` — 直接导入源码路径，避免 barrel（桶文件）  
- `bundle-dynamic-imports` — 重组件用 `next/dynamic`  
- `bundle-defer-third-party` — 分析/日志等在 hydration 之后再加载  
- `bundle-conditional` — 仅在功能启用时再加载模块  
- `bundle-preload` — 悬停/聚焦时预加载以改善体感速度  

### 3. 服务端性能（高）

- `server-auth-actions` — Server Action 要像 API 路由一样做鉴权  
- `server-cache-react` — 用 `React.cache()` 做单次请求内去重  
- `server-cache-lru` — 跨请求缓存用 LRU  
- `server-dedup-props` — 避免 RSC props 重复序列化  
- `server-hoist-static-io` — 静态 I/O（字体、Logo）提升到模块顶层  
- `server-no-shared-module-state` — RSC/SSR 中避免模块级可变请求状态  
- `server-serialization` — 传给客户端组件的数据尽量精简  
- `server-parallel-fetching` — 调整组件结构以并行请求  
- `server-parallel-nested-fetching` — 在 `Promise.all` 内按条链式嵌套请求  
- `server-after-nonblocking` — 用 `after()` 做非阻塞收尾工作  

### 4. 客户端数据获取（中高）

- `client-swr-dedup` — 用 SWR 自动合并重复请求  
- `client-event-listeners` — 全局事件监听去重  
- `client-passive-event-listeners` — 滚动相关用 passive 监听  
- `client-localstorage-schema` — localStorage 做版本号并只存必要字段  

### 5. 重渲染优化（中）

- `rerender-defer-reads` — 若状态只在回调里读，不要为其订阅  
- `rerender-memo` — 昂贵计算拆到 memo 化的子组件  
- `rerender-memo-with-default-value` — 非原始类型默认值提升到常量  
- `rerender-dependencies` — effect 依赖尽量用原始值  
- `rerender-derived-state` — 订阅派生布尔，而非连续变化的原值  
- `rerender-derived-state-no-effect` — 在渲染期派生状态，而非 effect  
- `rerender-functional-setstate` — 用函数式 `setState` 保持回调稳定  
- `rerender-lazy-state-init` — 昂贵初值用 `useState(() => ...)`  
- `rerender-simple-expression-in-memo` — 简单原始结果不要用 useMemo  
- `rerender-split-combined-hooks` — 依赖独立的逻辑拆成多个 hook  
- `rerender-move-effect-to-event` — 交互副作用放进事件处理函数  
- `rerender-transitions` — 非紧急更新用 `startTransition`  
- `rerender-use-deferred-value` — 昂贵派生渲染用 `useDeferredValue` 保持输入跟手  
- `rerender-use-ref-transient-values` — 高频瞬时值用 ref  
- `rerender-no-inline-components` — 不要在组件内部再定义组件  

### 6. 渲染性能（中）

- `rendering-animate-svg-wrapper` — 动画做在外层 div，不要直接动画 SVG  
- `rendering-content-visibility` — 长列表用 `content-visibility`  
- `rendering-hoist-jsx` — 静态 JSX 提到组件外  
- `rendering-svg-precision` — 降低 SVG 坐标精度  
- `rendering-hydration-no-flicker` — 仅客户端数据用内联脚本避免闪烁  
- `rendering-hydration-suppress-warning` — 对预期不一致用 `suppressHydrationWarning`  
- `rendering-activity` — 显隐用 Activity 组件保留状态/DOM  
- `rendering-conditional-render` — 条件渲染用三元，慎用 `&&`  
- `rendering-usetransition-loading` — 加载态优先 `useTransition`  
- `rendering-resource-hints` — 用 React DOM 的资源提示 API 预加载  
- `rendering-script-defer-async` — script 使用 `defer` 或 `async`  

### 7. JavaScript 性能（低–中）

- `js-batch-dom-css` — 通过 class 或 cssText 批量改样式  
- `js-index-maps` — 重复按键查找先建 Map  
- `js-cache-property-access` — 循环内缓存对象属性  
- `js-cache-function-results` — 模块级 Map 缓存函数结果  
- `js-cache-storage` — 缓存 localStorage/sessionStorage 读  
- `js-combine-iterations` — 多个 filter/map 合并为单次循环  
- `js-length-check-first` — 昂贵数组比较前先比 length  
- `js-early-exit` — 函数尽早 return  
- `js-hoist-regexp` — RegExp 提出循环/渲染外  
- `js-min-max-loop` — 最值用循环而非 sort  
- `js-set-map-lookups` — 成员检测用 Set/Map 实现 O(1)  
- `js-tosorted-immutable` — 不可变排序用 `toSorted()`  
- `js-flatmap-filter` — `flatMap` 一次完成 map+filter  
- `js-request-idle-callback` — 非关键工作丢给浏览器空闲时段  

### 8. 进阶模式（低）

- `advanced-effect-event-deps` — 不要把 `useEffectEvent` 返回值放进 effect 依赖  
- `advanced-event-handler-refs` — 事件处理函数可放 ref  
- `advanced-init-once` — 应用级初始化每个加载周期只执行一次  
- `advanced-use-latest` — 用 useLatest 等模式保持回调最新且引用稳定  

## 如何使用

阅读各规则文件的详解与示例代码：

```
rules/async-parallel.md
rules/bundle-barrel-imports.md
```

每个规则文件通常包含：

- 为何重要（简要说明）  
- 错误写法示例与解释  
- 正确写法示例与解释  
- 补充上下文与参考链接  

## 完整汇编文档

展开全部规则的完整指南见：`AGENTS.md`
