---
name: xlsx
description: "凡以电子表格为主要输入或输出的任务都应使用本技能。包括：打开、读取、编辑或修复现有 .xlsx、.xlsm、.csv、.tsv（如增列、写公式、格式、图表、清洗杂乱数据）；从零或其它数据源新建表；或在表格类格式之间转换。用户随口提到表格文件名/路径（如「下载里的那个 xlsx」）并希望处理或基于其产出时，也应触发。也适用于把杂乱表数据（错行、表头错位、垃圾数据）整理成规范表格。交付物须为表格文件。若主要交付物是 Word、HTML 报告、独立 Python 脚本、数据库管道或 Google Sheets API 集成，即使涉及表格数据也不要触发本技能。"
license: 专有许可，完整条款见 LICENSE.txt
---

# 对交付物的要求

## 所有 Excel 文件

### 专业字体
- 除非用户另有说明，交付件应使用统一、专业的字体（如 Arial、Times New Roman）

### 公式零错误
- 每个 Excel 模型交付时**不得**存在公式错误（#REF!、#DIV/0!、#VALUE!、#N/A、#NAME?）

### 保留既有模板（更新模板时）
- 修改文件时须研究并**严格沿用**现有格式、样式与约定
- 不要对已有固定模式的文件强行套统一格式
- **既有模板约定始终优先于**下文通用指南

## 财务模型

### 颜色规范
除非用户或现有模板另有规定：

#### 行业常见配色
- **蓝色字（RGB: 0,0,255）**：硬编码输入、用户会改以做情景的数字  
- **黑色字（RGB: 0,0,0）**：**全部**公式与计算  
- **绿色字（RGB: 0,128,0）**：同一工作簿内跨表引用  
- **红色字（RGB: 255,0,0）**：指向外部文件的链接  
- **黄色底（RGB: 255,255,0）**：需重点关注的假设或待更新单元格  

### 数字格式

#### 必守规则
- **年份**：按**文本**显示（如 `"2024"`，不要显示成 `"2,024"`）  
- **货币**：使用 `$#,##0`；**务必**在表头注明单位（如 `Revenue ($mm)`）  
- **零值**：用数字格式把零显示为 `-`，百分比同理（如 `"$#,##0;($#,##0);-"`）  
- **百分比**：默认 `0.0%`（一位小数）  
- **倍数**：估值倍数（EV/EBITDA、P/E 等）用 `0.0x`  
- **负数**：用括号 `(123)`，不要用前导负号 `-123`  

### 公式编写

#### 假设摆放
- **所有**假设（增速、利润率、倍数等）放在独立假设区  
- 公式用单元格引用，不要写死数值  
- 例如：用 `=B5*(1+$B$6)` 而不是 `=B5*1.05`  

#### 避免公式错误
- 核对引用是否正确  
- 注意范围 off-by-one  
- 各预测期公式保持一致  
- 用边界情况测试（零、负数）  
- 确认无意外循环引用  

#### 硬编码数据来源说明
- 在旁注单元格或表末注释。格式：`"Source: [系统/文档], [日期], [具体出处], [如有则附 URL]"`  
- 示例：  
  - `"Source: Company 10-K, FY2024, Page 45, Revenue Note, [SEC EDGAR URL]"`  
  - `"Source: Company 10-Q, Q2 2025, Exhibit 99.1, [SEC EDGAR URL]"`  
  - `"Source: Bloomberg Terminal, 8/15/2025, AAPL US Equity"`  
  - `"Source: FactSet, 8/20/2025, Consensus Estimates Screen"`  

# XLSX 的创建、编辑与分析

## 概述

用户可能要求创建、编辑或分析 .xlsx 内容。不同任务可选用不同工具与工作流。

## 重要前提

**重算公式需要 LibreOffice**：可假定环境已安装 LibreOffice，并通过 `scripts/recalc.py` 重算公式。脚本首次运行会自动配置 LibreOffice（含沙箱等限制 Unix socket 的环境，由 `scripts/office/soffice.py` 处理）。

## 读取与分析

### 用 pandas 做数据分析
分析、可视化及常规表操作优先用 **pandas**：

```python
import pandas as pd

# 读 Excel
df = pd.read_excel('file.xlsx')  # 默认首张表
all_sheets = pd.read_excel('file.xlsx', sheet_name=None)  # 全部表，字典

# 分析
df.head()      # 预览
df.info()      # 列信息
df.describe()  # 统计

# 写 Excel
df.to_excel('output.xlsx', index=False)
```

## Excel 文件工作流

## 关键：用公式，不要写死计算结果

**计算一律用 Excel 公式，不要在 Python 里算完再把数值硬写入单元格。** 这样表格才能随源数据更新而重算。

### ❌ 错误 — 把计算结果写死
```python
# 差：在 Python 里求和再写入
total = df['Sales'].sum()
sheet['B10'] = total  # 写死 5000

# 差：在 Python 里算增长率
growth = (df.iloc[-1]['Revenue'] - df.iloc[0]['Revenue']) / df.iloc[0]['Revenue']
sheet['C5'] = growth  # 写死 0.15

# 差：在 Python 里算平均
avg = sum(values) / len(values)
sheet['D20'] = avg  # 写死 42.5
```

### ✅ 正确 — 使用 Excel 公式
```python
# 好：由 Excel 求和
sheet['B10'] = '=SUM(B2:B9)'

# 好：增长率用公式
sheet['C5'] = '=(C4-C2)/C2'

# 好：平均用 Excel 函数
sheet['D20'] = '=AVERAGE(D2:D19)'
```

适用于**所有**合计、百分比、比率、差额等。源数据变动后应能重新计算。

## 常用流程
1. **选工具**：分析/批量操作用 pandas；公式与格式用 openpyxl  
2. **创建/加载**：新建工作簿或打开已有文件  
3. **修改**：数据、公式、格式  
4. **保存**：写入文件  
5. **重算公式（写了公式则必做）**：运行 `scripts/recalc.py`  
   ```bash
   python scripts/recalc.py output.xlsx
   ```  
6. **校验并修复错误**：  
   - 脚本输出 JSON，含错误详情  
   - 若 `status` 为 `errors_found`，查看 `error_summary` 中的类型与位置  
   - 修复后再次重算  
   - 常见错误：  
     - `#REF!`：引用无效  
     - `#DIV/0!`：除零  
     - `#VALUE!`：类型不匹配  
     - `#NAME?`：函数名无法识别  

### 新建 Excel

```python
# openpyxl：公式与格式
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
sheet = wb.active

# 数据
sheet['A1'] = 'Hello'
sheet['B1'] = 'World'
sheet.append(['Row', 'of', 'data'])

# 公式
sheet['B2'] = '=SUM(A1:A10)'

# 格式
sheet['A1'].font = Font(bold=True, color='FF0000')
sheet['A1'].fill = PatternFill('solid', start_color='FFFF00')
sheet['A1'].alignment = Alignment(horizontal='center')

# 列宽
sheet.column_dimensions['A'].width = 20

wb.save('output.xlsx')
```

### 编辑已有 Excel

```python
# openpyxl：保留公式与格式
from openpyxl import load_workbook

wb = load_workbook('existing.xlsx')
sheet = wb.active  # 或 wb['SheetName']

# 多表
for sheet_name in wb.sheetnames:
    sheet = wb[sheet_name]
    print(f"Sheet: {sheet_name}")

# 改单元格
sheet['A1'] = 'New Value'
sheet.insert_rows(2)   # 在第 2 行前插入一行
sheet.delete_cols(3)   # 删除第 3 列

# 新工作表
new_sheet = wb.create_sheet('NewSheet')
new_sheet['A1'] = 'Data'

wb.save('modified.xlsx')
```

## 重算公式

openpyxl 写入的公式在文件中多为字符串，**未必带计算结果**。请用 `scripts/recalc.py`：

```bash
python scripts/recalc.py <excel_file> [timeout_seconds]
```

示例：
```bash
python scripts/recalc.py output.xlsx 30
```

脚本会：
- 首次运行配置 LibreOffice 宏  
- 重算所有工作表中的公式  
- 扫描全部单元格中的 Excel 错误（#REF!、#DIV/0! 等）  
- 返回 JSON，含错误位置与计数  
- 支持 Linux 与 macOS  

## 公式自检清单

### 必做
- [ ] **抽 2～3 个引用试算**：确认取值正确再铺开模型  
- [ ] **列对应**：确认列号与 Excel 一致（如第 64 列 = BL，不是 BK）  
- [ ] **行号**：Excel 行为 1 起算（DataFrame 第 5 行常为 Excel 第 6 行）  

### 常见坑
- [ ] **NaN**：用 `pd.notna()` 等处理空值  
- [ ] **极右列**：财年数据常在 50 列以后  
- [ ] **多处匹配**：不要只取第一处  
- [ ] **除零**：公式里 `/` 前确认分母（避免 #DIV/0!）  
- [ ] **错误引用**：核对每个引用是否指向目标单元格（避免 #REF!）  
- [ ] **跨表**：使用正确语法（如 `Sheet1!A1`）  

### 测试策略
- [ ] **先小范围**：2～3 个单元格验证公式再批量复制  
- [ ] **依赖完整**：公式引用的单元格都存在  
- [ ] **边界**：含 0、负数、极大值  

### 解读 `scripts/recalc.py` 输出
返回 JSON，例如：
```json
{
  "status": "success",
  "total_errors": 0,
  "total_formulas": 42,
  "error_summary": {
    "#REF!": {
      "count": 2,
      "locations": ["Sheet1!B5", "Sheet1!C10"]
    }
  }
}
```
（`status` 也可能为 `errors_found`；无错误时可能没有 `error_summary` 或为空。）

## 最佳实践

### 库选择
- **pandas**：分析、批量读写、简单导出  
- **openpyxl**：复杂格式、公式、Excel 专有特性  

### openpyxl 注意
- 行列从 **1** 开始（`row=1, column=1` 即 A1）  
- 读已计算值：`load_workbook('file.xlsx', data_only=True)`  
- **警告**：以 `data_only=True` 打开再保存会**把公式替换为数值且不可恢复**  
- 大文件：读用 `read_only=True`，写用 `write_only=True`  
- 公式会保留但未必已求值 — 用 `scripts/recalc.py` 更新计算结果  

### pandas 注意
- 指定 `dtype` 避免推断问题：`pd.read_excel('file.xlsx', dtype={'id': str})`  
- 大文件只读部分列：`pd.read_excel('file.xlsx', usecols=['A', 'C', 'E'])`  
- 日期：`pd.read_excel('file.xlsx', parse_dates=['date_column'])`  

## 代码风格（Python）
**重要**：为 Excel 操作生成 Python 时：
- 尽量简短，不写多余注释  
- 避免冗长变量名与重复操作  
- 避免无意义的 `print`  

**对 Excel 文件本身**：
- 复杂公式或重要假设可在单元格批注中说明  
- 硬编码数据注明来源  
- 关键计算与模型分区可加说明性备注  
