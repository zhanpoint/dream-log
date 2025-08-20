"""
梦境分析结构化输出模型
精简版本 - 聚焦4个核心板块，提供最有价值的洞察
"""
from typing import List
from pydantic import BaseModel, Field, ConfigDict


class MainSymbol(BaseModel):
    """核心象征模型"""
    symbol: str = Field(description="象征元素名称")
    personal_meaning: str = Field(description="个性化解读")
    life_connection: str = Field(description="与现实生活的联系")


class AnalysisSummary(BaseModel):
    """梦境核心洞察模型 - 最重要的板块"""
    title: str = Field(description="板块标题", default="梦境核心洞察")
    one_sentence_insight: str = Field(description="一句话核心洞察")
    key_insights: List[str] = Field(description="关键洞察列表", min_length=3, max_length=5)
    emotional_core: str = Field(description="情绪变化的核心意义")


class DreamNarrative(BaseModel):
    """梦境故事线模型"""
    title: str = Field(description="板块标题", default="梦境故事线")
    story_arc: str = Field(description="梦境的叙事结构和发展脉络")
    turning_points: List[str] = Field(description="关键转折点及其意义", min_length=2, max_length=3)
    hidden_message: str = Field(description="梦境可能传达的潜在信息")


class SymbolDeepDive(BaseModel):
    """核心象征深挖模型"""
    title: str = Field(description="板块标题", default="核心象征解读")
    main_symbols: List[MainSymbol] = Field(description="最重要的象征", min_length=2, max_length=4)
    symbol_pattern: str = Field(description="象征之间的关联模式")


class GrowthGuidance(BaseModel):
    """个人成长启示模型"""
    title: str = Field(description="板块标题", default="个人成长启示")
    self_discovery: str = Field(description="梦境揭示的自我认知")
    practical_actions: List[str] = Field(description="具体可行的建议", min_length=2, max_length=3)
    reflection_questions: List[str] = Field(description="引发深思的问题", min_length=2, max_length=3)
    encouraging_message: str = Field(description="温暖鼓励的结语")


class DreamAnalysisResult(BaseModel):
    """梦境分析结果主模型 - 精简版本"""
    model_config = ConfigDict(extra="forbid", validate_assignment=True)
    
    analysis_summary: AnalysisSummary
    dream_narrative: DreamNarrative
    symbol_deep_dive: SymbolDeepDive
    growth_guidance: GrowthGuidance


class QueryExpansionResult(BaseModel):
    """查询扩展结果模型"""
    model_config = ConfigDict(extra="forbid", validate_assignment=True)
    
    primary_queries: List[str] = Field(min_length=1, max_length=3)
    query_rationale: str
