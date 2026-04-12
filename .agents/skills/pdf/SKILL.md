---
name: pdf
description: 凡与 PDF 相关的操作都应使用本技能：读取或提取文本/表格、合并或拆分 PDF、旋转页面、加水印、创建新 PDF、填写表单、加密/解密、提取图片，以及对扫描件做 OCR 使其可搜索。用户提到 .pdf 文件或要求生成 PDF 时，使用本技能。
license: 专有许可，完整条款见 LICENSE.txt
---

# PDF 处理指南

## 概述

本指南介绍使用 Python 库与命令行工具完成常见 PDF 操作。高级能力、JavaScript 库与更细示例见 **REFERENCE.md**。若需填写 PDF 表单，请阅读 **FORMS.md** 并按其中步骤操作。

## 快速上手

```python
from pypdf import PdfReader, PdfWriter

# 读取 PDF
reader = PdfReader("document.pdf")
print(f"Pages: {len(reader.pages)}")

# 提取文本
text = ""
for page in reader.pages:
    text += page.extract_text()
```

## Python 库

### pypdf — 基础操作

#### 合并 PDF
```python
from pypdf import PdfWriter, PdfReader

writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
    reader = PdfReader(pdf_file)
    for page in reader.pages:
        writer.add_page(page)

with open("merged.pdf", "wb") as output:
    writer.write(output)
```

#### 拆分 PDF
```python
reader = PdfReader("input.pdf")
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as output:
        writer.write(output)
```

#### 提取元数据
```python
reader = PdfReader("document.pdf")
meta = reader.metadata
print(f"Title: {meta.title}")
print(f"Author: {meta.author}")
print(f"Subject: {meta.subject}")
print(f"Creator: {meta.creator}")
```

#### 旋转页面
```python
reader = PdfReader("input.pdf")
writer = PdfWriter()

page = reader.pages[0]
page.rotate(90)  # 顺时针旋转 90 度
writer.add_page(page)

with open("rotated.pdf", "wb") as output:
    writer.write(output)
```

### pdfplumber — 文本与表格提取

#### 保留版式提取文本
```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        print(text)
```

#### 提取表格
```python
with pdfplumber.open("document.pdf") as pdf:
    for i, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for j, table in enumerate(tables):
            print(f"第 {i+1} 页，第 {j+1} 个表格：")
            for row in table:
                print(row)
```

#### 表格提取进阶（转 DataFrame / Excel）
```python
import pandas as pd

with pdfplumber.open("document.pdf") as pdf:
    all_tables = []
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if table:  # 非空表
                df = pd.DataFrame(table[1:], columns=table[0])
                all_tables.append(df)

# 合并所有表格
if all_tables:
    combined_df = pd.concat(all_tables, ignore_index=True)
    combined_df.to_excel("extracted_tables.xlsx", index=False)
```

### reportlab — 创建 PDF

#### 基础创建
```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

c = canvas.Canvas("hello.pdf", pagesize=letter)
width, height = letter

# 文本
c.drawString(100, height - 100, "Hello World!")
c.drawString(100, height - 120, "This is a PDF created with reportlab")

# 线段
c.line(100, height - 140, 400, height - 140)

c.save()
```

#### 多页 PDF（Platypus）
```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate("report.pdf", pagesize=letter)
styles = getSampleStyleSheet()
story = []

title = Paragraph("Report Title", styles['Title'])
story.append(title)
story.append(Spacer(1, 12))

body = Paragraph("This is the body of the report. " * 20, styles['Normal'])
story.append(body)
story.append(PageBreak())

# 第 2 页
story.append(Paragraph("Page 2", styles['Heading1']))
story.append(Paragraph("Content for page 2", styles['Normal']))

doc.build(story)
```

#### 下标与上标

**重要：** 不要在 ReportLab 生成的 PDF 里使用 Unicode 上下标字符（₀₁₂₃₄₅₆₇₈₉、⁰¹²³⁴⁵⁶⁷⁸⁹）。内置字体通常不含这些字形，会显示成**黑块**。

请在 `Paragraph` 中使用 ReportLab 的 XML 标记：

```python
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet

styles = getSampleStyleSheet()

# 下标：用 <sub>
chemical = Paragraph("H<sub>2</sub>O", styles['Normal'])

# 上标：用 <super>
squared = Paragraph("x<super>2</super> + y<super>2</super>", styles['Normal'])
```

若使用 canvas 直接绘制文字（非 Paragraph），请通过调整字号与位置模拟上下标，**不要**依赖 Unicode 上下标字符。

## 命令行工具

### pdftotext（poppler-utils）
```bash
# 提取文本
pdftotext input.pdf output.txt

# 保留版式提取
pdftotext -layout input.pdf output.txt

# 指定页范围
pdftotext -f 1 -l 5 input.pdf output.txt  # 第 1–5 页
```

### qpdf
```bash
# 合并
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf

# 按页拆分
qpdf input.pdf --pages . 1-5 -- pages1-5.pdf
qpdf input.pdf --pages . 6-10 -- pages6-10.pdf

# 旋转
qpdf input.pdf output.pdf --rotate=+90:1  # 第 1 页顺时针 90°

# 去密码
qpdf --password=mypassword --decrypt encrypted.pdf decrypted.pdf
```

### pdftk（若已安装）
```bash
# 合并
pdftk file1.pdf file2.pdf cat output merged.pdf

# 拆分
pdftk input.pdf burst

# 旋转
pdftk input.pdf rotate 1east output rotated.pdf
```

## 常见任务

### 扫描版 PDF 提取文字（OCR）
```python
# 需要: pip install pytesseract pdf2image
import pytesseract
from pdf2image import convert_from_path

images = convert_from_path('scanned.pdf')

text = ""
for i, image in enumerate(images):
    text += f"第 {i+1} 页：\n"
    text += pytesseract.image_to_string(image)
    text += "\n\n"

print(text)
```

### 添加水印
```python
from pypdf import PdfReader, PdfWriter

watermark = PdfReader("watermark.pdf").pages[0]

reader = PdfReader("document.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(watermark)
    writer.add_page(page)

with open("watermarked.pdf", "wb") as output:
    writer.write(output)
```

### 提取内嵌图片
```bash
# pdfimages（poppler-utils）
pdfimages -j input.pdf output_prefix

# 会生成 output_prefix-000.jpg、output_prefix-001.jpg 等
```

### 密码保护
```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

writer.encrypt("userpassword", "ownerpassword")

with open("encrypted.pdf", "wb") as output:
    writer.write(output)
```

## 速查

| 任务 | 推荐工具 | 命令/代码 |
|------|----------|-----------|
| 合并 PDF | pypdf | `writer.add_page(page)` |
| 拆分 PDF | pypdf | 每页单独成文件 |
| 提取文本 | pdfplumber | `page.extract_text()` |
| 提取表格 | pdfplumber | `page.extract_tables()` |
| 创建 PDF | reportlab | Canvas 或 Platypus |
| 命令行合并 | qpdf | `qpdf --empty --pages ...` |
| 扫描件 OCR | pytesseract | 先转为图片再识别 |
| 填写表单 | pdf-lib 或 pypdf（见 FORMS.md） | 见 FORMS.md |

## 后续阅读

- 进阶 **pypdfium2** 用法见 **REFERENCE.md**  
- JavaScript 库（如 **pdf-lib**）见 **REFERENCE.md**  
- 填写 PDF 表单请按 **FORMS.md** 操作  
- 排错与其它说明见 **REFERENCE.md**  
