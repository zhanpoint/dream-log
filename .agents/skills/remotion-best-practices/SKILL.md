---
name: remotion-best-practices
description: Remotion 最佳实践——用 React 制作视频
metadata:
  tags: remotion, video, react, animation, composition
---

## 何时使用

在处理 **Remotion** 相关代码时启用本技能，以获取该领域的专项知识。

## 字幕（Captions）

处理字幕或副标题时，请加载 [./rules/subtitles.md](./rules/subtitles.md) 获取更多说明。

## 使用 FFmpeg

进行部分视频操作（如裁剪视频、检测静音等）时应使用 FFmpeg。请加载 [./rules/ffmpeg.md](./rules/ffmpeg.md) 获取更多说明。

## 音频可视化

需要将音频可视化（频谱条、波形、随低音反应的效果等）时，请加载 [./rules/audio-visualization.md](./rules/audio-visualization.md) 获取更多说明。

## 音效

需要使用音效时，请加载 [./rules/sound-effects.md](./rules/sound-effects.md) 获取更多说明。

## 如何使用

按需阅读各规则文件中的详解与代码示例：

- [rules/3d.md](rules/3d.md) — 在 Remotion 中用 Three.js 与 React Three Fiber 做 3D 内容  
- [rules/animations.md](rules/animations.md) — Remotion 基础动画能力  
- [rules/assets.md](rules/assets.md) — 在 Remotion 中导入图片、视频、音频与字体  
- [rules/audio.md](rules/audio.md) — Remotion 中的音频：导入、裁剪、音量、速度、音高  
- [rules/calculate-metadata.md](rules/calculate-metadata.md) — 动态设置合成（composition）时长、尺寸与 props  
- [rules/can-decode.md](rules/can-decode.md) — 用 Mediabunny 检测视频是否可被浏览器解码  
- [rules/charts.md](rules/charts.md) — Remotion 中的图表与数据可视化（柱状、饼图、折线、股票图等）  
- [rules/compositions.md](rules/compositions.md) — 定义 composition、静帧、文件夹、默认 props 与动态 metadata  
- [rules/extract-frames.md](rules/extract-frames.md) — 用 Mediabunny 在指定时间戳从视频中抽取帧  
- [rules/fonts.md](rules/fonts.md) — 在 Remotion 中加载 Google Fonts 与本地字体  
- [rules/get-audio-duration.md](rules/get-audio-duration.md) — 用 Mediabunny 获取音频时长（秒）  
- [rules/get-video-dimensions.md](rules/get-video-dimensions.md) — 用 Mediabunny 获取视频宽高  
- [rules/get-video-duration.md](rules/get-video-duration.md) — 用 Mediabunny 获取视频时长（秒）  
- [rules/gifs.md](rules/gifs.md) — 让 GIF 与 Remotion 时间轴同步显示  
- [rules/images.md](rules/images.md) — 使用 Img 组件在 Remotion 中嵌入图片  
- [rules/light-leaks.md](rules/light-leaks.md) — 使用 @remotion/light-leaks 做漏光叠加效果  
- [rules/lottie.md](rules/lottie.md) — 在 Remotion 中嵌入 Lottie 动画  
- [rules/measuring-dom-nodes.md](rules/measuring-dom-nodes.md) — 在 Remotion 中测量 DOM 元素尺寸  
- [rules/measuring-text.md](rules/measuring-text.md) — 测量文字尺寸、让文字适配容器、检测溢出  
- [rules/sequencing.md](rules/sequencing.md) — Remotion 序列编排：延迟、裁剪、限制片段时长等  
- [rules/tailwind.md](rules/tailwind.md) — 在 Remotion 中使用 Tailwind CSS  
- [rules/text-animations.md](rules/text-animations.md) — Remotion 中的字体与文字动画模式  
- [rules/timing.md](rules/timing.md) — Remotion 插值曲线：线性、easing、弹簧动画等  
- [rules/transitions.md](rules/transitions.md) — Remotion 场景转场模式  
- [rules/transparent-videos.md](rules/transparent-videos.md) — 渲染带透明通道的视频  
- [rules/trimming.md](rules/trimming.md) — Remotion 裁剪模式：剪掉动画开头或结尾  
- [rules/videos.md](rules/videos.md) — 在 Remotion 中嵌入视频：裁剪、音量、速度、循环、音高  
- [rules/parameters.md](rules/parameters.md) — 通过 Zod schema 让视频参数可配置  
- [rules/maps.md](rules/maps.md) — 使用 Mapbox 添加地图并做动画  
- [rules/voiceover.md](rules/voiceover.md) — 使用 ElevenLabs TTS 为 Remotion 合成添加 AI 生成旁白  
