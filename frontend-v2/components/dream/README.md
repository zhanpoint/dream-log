# Dream Components

梦境相关的 UI 组件集合。

## 组件列表

### 1. ImageUpload - 图片上传组件
用于上传和管理梦境相关的图片。

**功能：**
- 支持多图片上传（最多 8 张）
- 图片预览
- 删除图片
- 拖拽排序

### 2. VoiceRecorder - 语音录制组件
实时语音转文字功能，使用 Google Cloud Speech-to-Text API。

**功能：**
- 实时语音识别
- 声波动画效果
- WebSocket 流式传输
- 自动插入转录文本

### 3. DrawingBoard - 画板组件
功能完整的绘画工具，用于创作梦境相关的图画。

**功能：**
- 🎨 **画笔工具**：9 种预设颜色
- 🖌️ **画笔粗细**：1-20 像素可调
- 🧹 **橡皮擦**：支持擦除功能
- 🌓 **背景切换**：浅色/深色背景
- ↩️ **撤销/重做**：完整的历史记录管理
- 🗑️ **清空画布**：一键清空
- 💾 **保存**：导出为 PNG 格式
- 📱 **触摸支持**：支持触摸屏设备

**使用示例：**

```tsx
import { DrawingBoard } from "@/components/dream/drawing-board";

function MyComponent() {
  const [open, setOpen] = useState(false);

  const handleSave = (blob: Blob) => {
    // 处理保存的图片
    const file = new File([blob], "drawing.png", { type: "image/png" });
    // ... 上传或添加到图片列表
  };

  return (
    <>
      <button onClick={() => setOpen(true)}>打开画板</button>
      <DrawingBoard
        open={open}
        onOpenChange={setOpen}
        onSave={handleSave}
      />
    </>
  );
}
```

## 技术实现

### DrawingBoard 技术细节

- **Canvas API**：使用原生 Canvas 2D API 进行绘制
- **路径记录**：记录所有绘制路径，支持撤销/重做
- **高 DPI 支持**：自动适配高分辨率屏幕
- **性能优化**：使用相对坐标系统，减少重绘开销
- **触摸优化**：支持 touch 事件，适配移动设备

### 数据结构

```typescript
interface DrawPoint {
  x: number;        // 相对坐标 (0-1)
  y: number;        // 相对坐标 (0-1)
  color: string;    // 颜色
  size: number;     // 画笔粗细
  isEraser: boolean; // 是否为橡皮擦
}

interface DrawPath {
  points: DrawPoint[]; // 路径点集合
}
```

## 集成说明

在梦境创建页面 (`app/(app)/dreams/new/page.tsx`) 中：

1. **画板按钮**：位于梦境内容输入框底部操作栏，图片上传按钮和语音录制按钮之间
2. **保存处理**：画板保存的图片会自动添加到图片列表中，与上传的图片一起显示
3. **数量限制**：画板图片计入总图片数量（最多 8 张）

## 样式特点

- 简洁现代的 UI 设计
- 与整体应用风格一致
- 支持深色/浅色主题
- 流畅的交互动画
- 响应式布局
