"""
专业梦境解析Prompt模板
基于现代大模型提示词设计框架最佳实践，支持RAG知识库检索增强
"""
from langchain_core.prompts import PromptTemplate
from typing import Dict, Any, Optional


class DreamAnalysisPrompts:
    # 主要的梦境分析Prompt模板 - 聚焦用户核心需求的精简版本
    COMPREHENSIVE_DREAM_ANALYSIS_PROMPT = PromptTemplate(
        input_variables=[
            "dream_title", "dream_content", "categories", "tags",
            "lucidity_level", "vividness", "mood_before_sleep", "mood_in_dream", 
            "mood_after_waking", "sleep_quality", "personal_notes", "retrieved_knowledge"
        ],
        template="""<|system|>
你是一位温暖而敏锐的梦境向导。请直接切入重点，用最清晰、最浓缩的语言，为用户提炼出梦境中最有价值的信息。避免使用复杂的专业术语，让你的分析像一次启发性的对话。

<|context|>
以下是需要分析的梦境信息：

**梦境内容**
标题：{dream_title}
内容：{dream_content}

**梦境特征**
分类：{categories}
标签：{tags}
清醒度：{lucidity_level}/5 | 清晰度：{vividness}/5

**情绪历程**
睡前：{mood_before_sleep} → 梦中：{mood_in_dream} → 醒后：{mood_after_waking}

**补充信息**
睡眠质量：{sleep_quality}/5
个人笔记：{personal_notes}

**参考知识**
{retrieved_knowledge}

<|instructions|>
请用温暖、直接、启发性的语言进行分析。记住：
1. 避免冗长的引言和免责声明
2. 直击核心，提供最有价值的洞察
3. 用具体、生动的语言代替抽象术语
4. 每个洞察都要与梦境内容紧密相关
5. 鼓励自我探索而非给出绝对答案

<|output_format|>
**重要：必须返回纯JSON格式，不要使用任何markdown标记**

请生成包含以下4个核心板块的JSON对象：

1. analysis_summary对象 - 梦境核心洞察（最重要）
   - title: 字符串，"梦境核心洞察"
   - one_sentence_insight: 字符串，用一句话概括这个梦境最核心的含义（30-60字）
   - key_insights: 字符串数组，3-5个最重要的洞察点，每个洞察简洁有力（每条30-60字）
   - emotional_core: 字符串，情绪变化的核心意义（50-100字）

2. dream_narrative对象 - 梦境故事线
   - title: 字符串，"梦境故事线"
   - story_arc: 字符串，梦境的叙事结构和发展脉络（100-150字）
   - turning_points: 字符串数组，2-3个关键转折点及其意义（每条40-80字）
   - hidden_message: 字符串，梦境可能传达的潜在信息（80-120字）

3. symbol_deep_dive对象 - 核心象征深挖
   - title: 字符串，"核心象征解读"
   - main_symbols: 对象数组，2-4个最重要的象征
     每个象征包含：
     - symbol: 字符串，象征元素名称
     - personal_meaning: 字符串，个性化解读（40-80字）
     - life_connection: 字符串，与现实生活的联系（40-80字）
   - symbol_pattern: 字符串，象征之间的关联模式（80-120字）

4. growth_guidance对象 - 个人成长启示
   - title: 字符串，"个人成长启示"
   - self_discovery: 字符串，这个梦境揭示的自我认知（80-120字）
   - practical_actions: 字符串数组，2-3个具体可行的建议（每条40-80字）
   - reflection_questions: 字符串数组，2-3个引发深思的问题（每条20-40字）
   - encouraging_message: 字符串，温暖鼓励的结语（60-100字）

要求：
1. 每个板块的内容必须聚焦、精炼、有价值
2. 避免模板化语言，让每次分析都独特而贴切
3. 所有字段名必须使用英文，内容使用中文
4. 字数限制是为了确保精炼，不要为了凑字数而废话
"""
    )
    
    # 查询扩展Prompt - 用于从梦境数据生成检索关键词
    QUERY_EXPANSION_PROMPT = PromptTemplate(
        input_variables=["dream_content", "categories", "tags", "mood_in_dream"],
        template="""<|system|>
你是一位专业的梦境研究专家，擅长从梦境描述中提取核心概念和关键词，用于知识库检索。

<|task|>
基于以下梦境信息，生成1-3个最适合用于梦境知识库检索的核心问题或关键词组合：

**梦境内容：** {dream_content}
**分类标签：** {categories}
**相关标签：** {tags}
**梦中情绪：** {mood_in_dream}

<|output_format|>
**重要输出格式要求**

你必须返回纯JSON格式，不要使用任何markdown标记（如```json```），直接返回JSON对象。

返回包含以下2个字段的JSON结构：

1. primary_queries：字符串数组，包含1-3个核心检索问题或关键词组合
2. query_rationale：字符串，说明生成这些查询的理由和预期检索目标

"""
    )
    
    @classmethod
    def create_analysis_prompt(cls, **kwargs) -> PromptTemplate:
        """创建梦境分析Prompt实例"""
        return cls.COMPREHENSIVE_DREAM_ANALYSIS_PROMPT
    
    @classmethod 
    def create_query_expansion_prompt(cls, **kwargs) -> PromptTemplate:
        """创建查询扩展Prompt实例"""
        return cls.QUERY_EXPANSION_PROMPT
    
    @classmethod
    def format_dream_data_for_analysis(cls, dream_data: Dict[str, Any]) -> Dict[str, str]:
        """
        将梦境数据格式化为Prompt所需的格式
        
        Args:
            dream_data: 梦境数据字典
            
        Returns:
            格式化后的数据字典
        """
        # 处理分类和标签
        categories_text = ", ".join([cat.get('name', '') for cat in dream_data.get('categories', [])])
        tags_text = ", ".join([tag.get('name', '') for tag in dream_data.get('tags', [])])
        
        # 处理显示名称
        lucidity_display = dream_data.get('lucidity_level_display', f"{dream_data.get('lucidity_level', 0)}/5")
        mood_before_display = dream_data.get('mood_before_sleep_display', dream_data.get('mood_before_sleep', '未知'))
        mood_in_display = dream_data.get('mood_in_dream_display', dream_data.get('mood_in_dream', '未知'))
        mood_after_display = dream_data.get('mood_after_waking_display', dream_data.get('mood_after_waking', '未知'))
        sleep_quality_display = dream_data.get('sleep_quality_display', f"{dream_data.get('sleep_quality', 0)}/5")
        
        return {
            'dream_title': dream_data.get('title', '未命名梦境'),
            'dream_content': dream_data.get('content', ''),
            'categories': categories_text or '未分类',
            'tags': tags_text or '无标签',
            'lucidity_level': lucidity_display,
            'vividness': f"{dream_data.get('vividness', 0)}/5" if dream_data.get('vividness') else '未评级',
            'mood_before_sleep': mood_before_display,
            'mood_in_dream': mood_in_display,
            'mood_after_waking': mood_after_display,
            'sleep_quality': sleep_quality_display,
            'personal_notes': dream_data.get('personal_notes', '无特别备注'),
            'retrieved_knowledge': ''  # 这个字段将在RAG检索后填充
        }