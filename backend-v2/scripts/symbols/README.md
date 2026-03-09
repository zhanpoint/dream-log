# 梦境象征符号脚本

本目录集中存放与「梦境符号词典」内容生成、导入相关的脚本与数据文件。

## 文件说明

| 文件 | 说明 |
|------|------|
| `symbols_input.json` | 待生成的符号列表（名称 + 分类），可编辑扩展 |
| `batch_generate.py` | 调用 Dify 工作流批量生成结构化内容，输出 `symbols_output.json` |
| `symbols_output.json` | 生成结果（运行 batch_generate 后产生） |
| `failed_batches.json` | 失败批次记录（若有），便于重跑 |
| `import_symbols.py` | 将 `symbols_output.json` 导入 PostgreSQL |

## 使用流程

在 **backend-v2 根目录** 下执行：

1. 编辑 `scripts/symbols/batch_generate.py` 顶部，填入 Dify API Key 等配置。
2. 运行批量生成：
   ```bash
   uv run python scripts/symbols/batch_generate.py
   ```
3. 导入数据库：
   ```bash
   uv run python scripts/symbols/import_symbols.py
   ```

## 扩展符号

编辑 `symbols_input.json`，按 `{"name": "符号名", "category": "分类"}` 追加条目，分类建议：动物、行为、人物、地点、物体、情绪、身体、自然现象。
