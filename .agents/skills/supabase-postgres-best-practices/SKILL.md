---
name: supabase-postgres-best-practices
description: Supabase 出品的 Postgres 性能优化与最佳实践。在编写、审查或优化 Postgres 查询、表结构设计或数据库配置时使用本技能。
license: MIT
metadata:
  author: supabase
  version: "1.1.0"
  organization: Supabase
  date: 2026-01
  abstract: 面向使用 Supabase 与 Postgres 的开发者的性能优化综合指南。规则分 8 大类，按影响从关键（查询性能、连接管理）到增量（高级特性）排序。每条规则含详解、错误与正确 SQL 对照、执行计划分析，以及可指导自动优化与代码生成的具体性能指标。
---

# Supabase Postgres 最佳实践

面向 **Postgres** 的性能优化综合指南，由 **Supabase** 维护。规则分 **8** 大类，按影响优先级排序，用于指导自动化的查询优化与 schema 设计。

## 何时采用

在以下场景参考本指南：

- 编写 SQL 或设计 schema  
- 实现索引或做查询优化  
- 审查数据库性能问题  
- 配置连接池或扩展能力  
- 针对 Postgres 特有特性做优化  
- 使用行级安全（Row-Level Security，RLS）  

## 按优先级划分的规则类别

| 优先级 | 类别 | 影响 | 前缀 |
|--------|------|------|------|
| 1 | 查询性能 | 关键 | `query-` |
| 2 | 连接管理 | 关键 | `conn-` |
| 3 | 安全与 RLS | 关键 | `security-` |
| 4 | Schema 设计 | 高 | `schema-` |
| 5 | 并发与锁 | 中高 | `lock-` |
| 6 | 数据访问模式 | 中 | `data-` |
| 7 | 监控与诊断 | 低–中 | `monitor-` |
| 8 | 高级特性 | 低 | `advanced-` |

## 如何使用

阅读各规则文件中的详解与 SQL 示例：

```
references/query-missing-indexes.md
references/schema-partial-indexes.md
references/_sections.md
```

每个规则文件通常包含：

- 为何重要（简要说明）  
- 错误 SQL 示例与解释  
- 正确 SQL 示例与解释  
- 可选的 EXPLAIN 输出或指标  
- 补充上下文与参考链接  
- 与 **Supabase** 相关的说明（如适用）  

## 参考链接

- https://www.postgresql.org/docs/current/
- https://supabase.com/docs
- https://wiki.postgresql.org/wiki/Performance_Optimization
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth/row-level-security
