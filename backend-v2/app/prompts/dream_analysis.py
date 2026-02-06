"""
梦境分析提示词模板
基于认知心理学、神经科学和睡眠医学
"""

STRUCTURE_PROMPT = """你是一位认知心理学家和梦境研究专家。
请将以下梦境叙述结构化提取为 JSON，包含:

1. events: 主要事件序列
2. characters: 人物角色 (类型/互动模式)
3. locations: 地点场景
4. timeline: 时间线
5. conflicts: 冲突点
6. goals: 梦中目标
7. perspective: 视角 (first_person/third_person/mixed)

梦境内容:
{content}

请直接返回 JSON，不要其他文字。"""

EMOTION_ANALYSIS_PROMPT = """你是情绪心理学专家，基于 Plutchik 情绪轮盘理论分析梦境。

任务: 分析以下梦境的8种基础情绪强度 (0-1)，并识别情绪转换轨迹。

8种基础情绪: joy, sadness, fear, anger, disgust, surprise, trust, anticipation

梦境内容:
{content}

返回格式 (严格 JSON):
{{
  "emotions_vector": {{"joy": 0.0, "sadness": 0.0, "fear": 0.0, "anger": 0.0, "disgust": 0.0, "surprise": 0.0, "trust": 0.0, "anticipation": 0.0}},
  "emotion_trajectory": ["emotion1", "emotion2"],
  "conflict_index": 0.0,
  "primary_emotion_cn": "中文情绪名"
}}"""

TITLE_GENERATION_PROMPT = """根据以下梦境内容，生成一个简短、诗意的中文标题（不超过10个字，不带引号）。

梦境内容:
{content}"""

INSIGHT_PROMPT = """你是一位结合认知神经科学和临床心理学的梦境分析师。

请基于以下信息，提供深度洞察分析:

梦境内容: {content}
睡眠质量: {sleep_quality}/5
清醒程度: {lucidity_level}/5
主导情绪: {primary_emotion}
前一天事件: {life_context}

返回格式 (严格 JSON):
{{
  "summary": {{
    "one_sentence": "核心总结",
    "key_themes": ["主题1", "主题2"]
  }},
  "cognitive_analysis": {{
    "memory_integration": "记忆整合模式分析",
    "cognitive_control_level": 0.0,
    "stress_processing": "压力加工分析"
  }},
  "sleep_correlation": {{
    "quality_factors": ["因素1"],
    "recommendations": ["建议1"]
  }},
  "recommendations": [
    {{"type": "sleep_improvement", "suggestion": "建议内容", "evidence": "基于什么"}}
  ]
}}"""
