---
name: docx
description: "凡涉及创建、读取、编辑或处理 Word 文档（.docx）时使用本技能。触发场景包括：提到「Word」「word 文档」「.docx」，或需要带目录、标题、页码、信头等格式的正式文档；从 .docx 提取或重组内容；插入/替换文档内图片；在 Word 中查找替换；处理修订或批注；将内容整理成规范的 Word 文档。若用户要「报告」「备忘录」「信件」「模板」等且交付物为 Word/.docx，使用本技能。不要用于 PDF、电子表格、Google Docs，或与文档生成无关的通用编程任务。"
license: 专有许可，完整条款见 LICENSE.txt
---

# DOCX 的创建、编辑与分析

## 概述

.docx 文件是一个包含多个 XML 文件的 ZIP 包。

## 速查

| 任务 | 做法 |
|------|------|
| 读取/分析内容 | `pandoc` 或解包查看原始 XML |
| 新建文档 | 使用 `docx-js` — 见下文「创建新文档」 |
| 编辑已有文档 | 解包 → 编辑 XML → 再打包 — 见下文「编辑已有文档」 |

### 将 .doc 转为 .docx

旧版 `.doc` 须先转换再编辑：

```bash
python scripts/office/soffice.py --headless --convert-to docx document.doc
```

### 读取内容

```bash
# 提取文本（含修订跟踪）
pandoc --track-changes=all document.docx -o output.md

# 原始 XML
python scripts/office/unpack.py document.docx unpacked/
```

### 转为图片

```bash
python scripts/office/soffice.py --headless --convert-to pdf document.docx
pdftoppm -jpeg -r 150 document.pdf page
```

### 接受所有修订

生成已接受全部修订的干净文档（需要 LibreOffice）：

```bash
python scripts/accept_changes.py input.docx output.docx
```

---

## 创建新文档

用 JavaScript 生成 .docx，再校验。安装：`npm install -g docx`

### 初始化
```javascript
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        Header, Footer, AlignmentType, PageOrientation, LevelFormat, ExternalHyperlink,
        InternalHyperlink, Bookmark, FootnoteReferenceRun, PositionalTab,
        PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
        TabStopType, TabStopPosition, Column, SectionType,
        TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageNumber, PageBreak } = require('docx');

const doc = new Document({ sections: [{ children: [/* 正文节点 */] }] });
Packer.toBuffer(doc).then(buffer => fs.writeFileSync("doc.docx", buffer));
```

### 校验
生成文件后必须校验。若失败，解包、修正 XML 后再打包。
```bash
python scripts/office/validate.py doc.docx
```

### 纸张大小

```javascript
// 关键：docx-js 默认是 A4，不是 US Letter
// 请始终显式设置页面尺寸以保证一致
sections: [{
  properties: {
    page: {
      size: {
        width: 12240,   // 8.5 英寸，单位 DXA
        height: 15840   // 11 英寸
      },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 四边各 1 英寸
    }
  },
  children: [/* 正文节点 */]
}]
```

**常用纸张尺寸（DXA，1440 DXA = 1 英寸）：**

| 纸张 | 宽 | 高 | 内容区宽度（四边各 1" 边距） |
|------|-----|-----|------------------------------|
| US Letter | 12,240 | 15,840 | 9,360 |
| A4（默认） | 11,906 | 16,838 | 9,026 |

**横向：** docx-js 会在内部交换宽高，因此传入**竖向**尺寸即可，由库处理交换：
```javascript
size: {
  width: 12240,   // 较短边作为 width 传入
  height: 15840,  // 较长边作为 height 传入
  orientation: PageOrientation.LANDSCAPE  // 由 docx-js 写入 XML 时交换
},
// 内容宽度 = 15840 - 左边距 - 右边距（使用较长边）
```

### 样式（覆盖内置标题）

默认字体用 Arial（兼容性好）。标题保持黑色以利阅读。

```javascript
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } }, // 正文 12pt
    paragraphStyles: [
      // 重要：id 必须与内置样式完全一致才能覆盖
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } }, // TOC 需要 outlineLevel
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    children: [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Title")] }),
    ]
  }]
});
```

### 列表（禁止用手敲 Unicode 项目符号）

```javascript
// ❌ 错误 — 不要手动插入项目符号字符
new Paragraph({ children: [new TextRun("• Item")] })  // 不行
new Paragraph({ children: [new TextRun("\u2022 Item")] })  // 不行

// ✅ 正确 — 用 numbering 配置 + LevelFormat.BULLET
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    children: [
      new Paragraph({ numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Bullet item")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("Numbered item")] }),
    ]
  }]
});

// ⚠️ 每个 reference 是独立编号流
// 同一 reference = 连续编号 (1,2,3 再接 4,5,6)
// 不同 reference = 各自从 1 开始 (1,2,3 再 1,2,3)
```

### 表格

**关键：表格要设两套宽度** — 既要在 Table 上设 `columnWidths`，又要在每个 TableCell 上设 `width`。只设其一在部分环境下会排版错误。

```javascript
// 关键：始终设置表格总宽以保证一致渲染
// 关键：着色用 ShadingType.CLEAR（不要用 SOLID），否则易出现黑底
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

new Table({
  width: { size: 9360, type: WidthType.DXA }, // 一律 DXA（百分比在 Google Docs 会坏）
  columnWidths: [4680, 4680], // 列宽之和须等于表宽（DXA：1440 = 1 英寸）
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 4680, type: WidthType.DXA }, // 单元格也要设
          shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, // CLEAR 而非 SOLID
          margins: { top: 80, bottom: 80, left: 120, right: 120 }, // 内边距（不计入单元格宽度）
          children: [new Paragraph({ children: [new TextRun("Cell")] })]
        })
      ]
    })
  ]
})
```

**表宽计算：**

始终使用 `WidthType.DXA` — `WidthType.PERCENTAGE` 在 Google Docs 会出问题。

```javascript
// 表宽 = columnWidths 之和 = 内容区宽度
// US Letter、四边 1" 边距：12240 - 2880 = 9360 DXA
width: { size: 9360, type: WidthType.DXA },
columnWidths: [7000, 2360]  // 须相加等于表宽
```

**宽度规则：**
- **始终 `WidthType.DXA`** — 不要用 `WidthType.PERCENTAGE`（与 Google Docs 不兼容）
- 表格 `width.size` 须等于各 `columnWidths` 之和
- 单元格 `width` 须与对应列 `columnWidths[i]` 一致
- 单元格 `margins` 为内边距 — 缩小可排版区域，不增加单元格总宽
- 通栏表：使用「页宽 − 左右边距」得到的内容区宽度

### 图片

```javascript
// 关键：type 必填
new Paragraph({
  children: [new ImageRun({
    type: "png", // 必填：png, jpg, jpeg, gif, bmp, svg
    data: fs.readFileSync("image.png"),
    transformation: { width: 200, height: 150 },
    altText: { title: "Title", description: "Desc", name: "Name" } // 三项都要填
  })]
})
```

### 分页

```javascript
// 关键：PageBreak 必须放在 Paragraph 里
new Paragraph({ children: [new PageBreak()] })

// 或使用 pageBreakBefore
new Paragraph({ pageBreakBefore: true, children: [new TextRun("New page")] })
```

### 超链接

```javascript
// 外部链接
new Paragraph({
  children: [new ExternalHyperlink({
    children: [new TextRun({ text: "Click here", style: "Hyperlink" })],
    link: "https://example.com",
  })]
})

// 内部链接（书签 + 引用）
// 1. 在目标处创建书签
new Paragraph({ heading: HeadingLevel.HEADING_1, children: [
  new Bookmark({ id: "chapter1", children: [new TextRun("Chapter 1")] }),
]})
// 2. 链到该书签
new Paragraph({ children: [new InternalHyperlink({
  children: [new TextRun({ text: "See Chapter 1", style: "Hyperlink" })],
  anchor: "chapter1",
})]})
```

### 脚注

```javascript
const doc = new Document({
  footnotes: {
    1: { children: [new Paragraph("Source: Annual Report 2024")] },
    2: { children: [new Paragraph("See appendix for methodology")] },
  },
  sections: [{
    children: [new Paragraph({
      children: [
        new TextRun("Revenue grew 15%"),
        new FootnoteReferenceRun(1),
        new TextRun(" using adjusted metrics"),
        new FootnoteReferenceRun(2),
      ],
    })]
  }]
});
```

### 制表位

```javascript
// 同行右对齐（如标题对侧写日期）
new Paragraph({
  children: [
    new TextRun("Company Name"),
    new TextRun("\tJanuary 2025"),
  ],
  tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
})

// 点线前导符（目录风格）
new Paragraph({
  children: [
    new TextRun("Introduction"),
    new TextRun({ children: [
      new PositionalTab({
        alignment: PositionalTabAlignment.RIGHT,
        relativeTo: PositionalTabRelativeTo.MARGIN,
        leader: PositionalTabLeader.DOT,
      }),
      "3",
    ]}),
  ],
})
```

### 多栏版式

```javascript
// 等宽栏
sections: [{
  properties: {
    column: {
      count: 2,          // 栏数
      space: 720,        // 栏间距 DXA（720 = 0.5 英寸）
      equalWidth: true,
      separate: true,    // 栏间竖线
    },
  },
  children: [/* 内容自然跨栏流动 */]
}]

// 自定义栏宽（equalWidth 须为 false）
sections: [{
  properties: {
    column: {
      equalWidth: false,
      children: [
        new Column({ width: 5400, space: 720 }),
        new Column({ width: 3240 }),
      ],
    },
  },
  children: [/* 内容 */]
}]
```

用新 section 且 `type: SectionType.NEXT_COLUMN` 可强制分栏。

### 目录（TOC）

```javascript
// 关键：标题段落只能用 HeadingLevel，不要自定义 heading 样式
new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" })
```

### 页眉/页脚

```javascript
sections: [{
  properties: {
    page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } // 1440 = 1 英寸
  },
  headers: {
    default: new Header({ children: [new Paragraph({ children: [new TextRun("Header")] })] })
  },
  footers: {
    default: new Footer({ children: [new Paragraph({
      children: [new TextRun("Page "), new TextRun({ children: [PageNumber.CURRENT] })]
    })] })
  },
  children: [/* 正文 */]
}]
```

### docx-js 关键规则

- **显式设置纸张** — 默认 A4；美国文档用 US Letter（12240 × 15840 DXA）
- **横向仍传竖向宽高** — 由库交换；短边作 `width`，长边作 `height`，并设 `orientation: PageOrientation.LANDSCAPE`
- **不要用 `\n` 换行** — 用多个 `Paragraph`
- **不要用 Unicode 项目符号** — 用 `LevelFormat.BULLET` + numbering
- **PageBreak 必须在 Paragraph 内** — 单独放置会生成无效 XML
- **ImageRun 必须带 `type`** — 明确 png/jpg 等
- **表格总宽用 DXA** — 禁用 `WidthType.PERCENTAGE`（Google Docs）
- **表格双宽度** — `columnWidths` 与每个 cell 的 `width` 都要设且一致
- **表宽 = 列宽之和** — DXA 下须严格相加相等
- **建议单元格 margins** — 如 `margins: { top: 80, bottom: 80, left: 120, right: 120 }` 便于阅读
- **着色用 `ShadingType.CLEAR`** — 表格不要用 SOLID
- **不要用表格当分隔线** — 单元格有最小高度，会显示为空框（页眉页脚亦然）；改用 `Paragraph` 的 `border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 1 } }`。双栏页脚用制表位（见上文），不要用表格
- **TOC 仅认 HeadingLevel** — 标题段不要挂自定义样式替代
- **覆盖内置样式** — id 须精确：`"Heading1"`、`"Heading2"` 等
- **须含 `outlineLevel`** — TOC 依赖（H1=0，H2=1，…）

---

## 编辑已有文档

**须严格按顺序执行三步。**

### 第一步：解包
```bash
python scripts/office/unpack.py document.docx unpacked/
```
会解压 XML、美化、合并相邻 run，并将弯引号转为 XML 实体（`&#x201C;` 等）以便安全编辑。若不要合并 run，加 `--merge-runs false`。

### 第二步：编辑 XML

在 `unpacked/word/` 下编辑。模式见下文「XML 参考」。

**修订与批注的作者名默认使用「Claude」**，除非用户明确要求其他名字。

**字符串替换请直接用编辑工具的替换能力，不要为此写 Python 脚本。** 脚本增加无谓复杂度；编辑工具能明确展示被替换内容。

**关键：新增文本使用弯引号实体。** 插入含撇号或引号的内容时，用 XML 实体以符合排版习惯：
```xml
<!-- 专业排版用下列实体 -->
<w:t>Here&#x2019;s a quote: &#x201C;Hello&#x201D;</w:t>
```
| 实体 | 字符 |
|--------|-----------|
| `&#x2018;` | ‘（左单引号） |
| `&#x2019;` | ’（右单引号/撇号） |
| `&#x201C;` | “（左双引号） |
| `&#x201D;` | ”（右双引号） |

**添加批注：** 用 `comment.py` 处理多文件中的样板（正文须先做好 XML 转义）：
```bash
python scripts/comment.py unpacked/ 0 "Comment text with &amp; and &#x2019;"
python scripts/comment.py unpacked/ 1 "Reply text" --parent 0  # 回复批注 0
python scripts/comment.py unpacked/ 0 "Text" --author "Custom Author"  # 自定义作者
```
然后在 document.xml 中加入标记（见「XML 参考 — Comments」）。

### 第三步：打包
```bash
python scripts/office/pack.py unpacked/ output.docx --original document.docx
```
会校验并尝试自动修复、压缩 XML 并生成 DOCX。跳过校验可加 `--validate false`。

**自动修复会处理：**
- `durableId` ≥ 0x7FFFFFFF（重新生成合法 ID）
- 含空白的前导/尾随 `<w:t>` 缺少 `xml:space="preserve"`

**自动修复不会处理：**
- 畸形 XML、非法嵌套、关系缺失、违反 schema

### 常见陷阱

- **整段替换 `<w:r>`：** 做修订时，用完整的 `<w:del>...` / `<w:ins>...` 作为兄弟节点替换整个 `<w:r>...</w:r>`，不要在单个 run 内部插入修订标签。
- **保留 `<w:rPr>`：** 修订中的新 run 应复制原 run 的 `<w:rPr>`，以保留粗体、字号等。

---

## XML 参考

### Schema 与格式

- **`<w:pPr>` 内元素顺序：** `<w:pStyle>`、`<w:numPr>`、`<w:spacing>`、`<w:ind>`、`<w:jc>`，最后 `<w:rPr>`
- **空白：** 含首尾空格的 `<w:t>` 须加 `xml:space="preserve"`
- **RSID：** 须为 8 位十六进制（如 `00AB1234`）

### 修订（Tracked Changes）

**插入：**
```xml
<w:ins w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:t>inserted text</w:t></w:r>
</w:ins>
```

**删除：**
```xml
<w:del w:id="2" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>deleted text</w:delText></w:r>
</w:del>
```

**在 `<w:del>` 内：** 用 `<w:delText>` 代替 `<w:t>`，用 `<w:delInstrText>` 代替 `<w:instrText>`。

**最小化标记范围** — 只包住实际变动：
```xml
<!-- 将 "30 days" 改为 "60 days" -->
<w:r><w:t>The term is </w:t></w:r>
<w:del w:id="1" w:author="Claude" w:date="...">
  <w:r><w:delText>30</w:delText></w:r>
</w:del>
<w:ins w:id="2" w:author="Claude" w:date="...">
  <w:r><w:t>60</w:t></w:r>
</w:ins>
<w:r><w:t> days.</w:t></w:r>
```

**删除整段/整条条目** — 清空段落时，还须标记段落符为删除，否则会与下段无法合并。在 `<w:pPr><w:rPr>` 内加 `<w:del/>`：
```xml
<w:p>
  <w:pPr>
    <w:numPr>...</w:numPr>  <!-- 若存在列表编号 -->
    <w:rPr>
      <w:del w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z"/>
    </w:rPr>
  </w:pPr>
  <w:del w:id="2" w:author="Claude" w:date="2025-01-01T00:00:00Z">
    <w:r><w:delText>Entire paragraph content being deleted...</w:delText></w:r>
  </w:del>
</w:p>
```
若不在 `<w:pPr><w:rPr>` 中加 `<w:del/>`，接受修订后会留下空段落/空列表项。

**否决他人插入** — 在其 `<w:ins>` 内嵌套你的 `<w:del>`：
```xml
<w:ins w:author="Jane" w:id="5">
  <w:del w:author="Claude" w:id="10">
    <w:r><w:delText>their inserted text</w:delText></w:r>
  </w:del>
</w:ins>
```

**恢复他人删除** — 在其 `<w:del>` 之后新增 `<w:ins>`（不要改对方的 del）：
```xml
<w:del w:author="Jane" w:id="5">
  <w:r><w:delText>deleted text</w:delText></w:r>
</w:del>
<w:ins w:author="Claude" w:id="10">
  <w:r><w:t>deleted text</w:t></w:r>
</w:ins>
```

### 批注（Comments）

运行 `comment.py` 后（见第二步），在 document.xml 中加范围标记。回复用 `--parent`，并把子标记嵌在父范围内。

**关键：`<w:commentRangeStart>` 与 `<w:commentRangeEnd>` 与 `<w:r>` 平级，绝不能放在 `<w:r>` 内部。**

```xml
<!-- 批注标记是 w:p 的直接子节点，不在 w:r 内 -->
<w:commentRangeStart w:id="0"/>
<w:del w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>deleted</w:delText></w:r>
</w:del>
<w:r><w:t> more text</w:t></w:r>
<w:commentRangeEnd w:id="0"/>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>

<!-- 批注 0，回复 1 嵌套在内 -->
<w:commentRangeStart w:id="0"/>
  <w:commentRangeStart w:id="1"/>
  <w:r><w:t>text</w:t></w:r>
  <w:commentRangeEnd w:id="1"/>
<w:commentRangeEnd w:id="0"/>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="1"/></w:r>
```

### 图片

1. 将图片文件放入 `word/media/`
2. 在 `word/_rels/document.xml.rels` 增加关系：
```xml
<Relationship Id="rId5" Type=".../image" Target="media/image1.png"/>
```
3. 在 `[Content_Types].xml` 增加内容类型：
```xml
<Default Extension="png" ContentType="image/png"/>
```
4. 在 document.xml 中引用：
```xml
<w:drawing>
  <wp:inline>
    <wp:extent cx="914400" cy="914400"/>  <!-- EMU：914400 = 1 英寸 -->
    <a:graphic>
      <a:graphicData uri=".../picture">
        <pic:pic>
          <pic:blipFill><a:blip r:embed="rId5"/></pic:blipFill>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline>
</w:drawing>
```

---

## 依赖

- **pandoc**：文本提取  
- **docx**：`npm install -g docx`（新建文档）  
- **LibreOffice**：转 PDF（沙箱环境可通过 `scripts/office/soffice.py` 配置）  
- **Poppler**：`pdftoppm` 生成图片  
