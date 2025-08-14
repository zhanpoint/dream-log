"""
梦境分析结构化输出模型
基于Pydantic 2的现代化验证和序列化，符合LangChain v0.3最佳实践
"""
from typing import List
from pydantic import BaseModel, Field, ConfigDict

"""请确保AI生成的JSON结构与定义的Pydantic模型字段结构一致，否则会导致结构化输出验证失败。"""
class ProfessionalIntroduction(BaseModel):
    """专业介绍模型"""
    analysis_approach: str = Field(description="分析方法和理论基础")
    confidentiality_note: str = Field(description="解释权和保密性说明") 
    empathy_statement: str = Field(description="对梦境体验的理解表达")


class EmotionJourney(BaseModel):
    """情绪历程模型"""
    pre_sleep: str = Field(description="睡前情绪分析及对梦境的影响")
    during_dream: str = Field(description="梦中情绪的深层含义")
    post_wake: str = Field(description="醒后情绪反映的潜意识信息")


class EmotionalAnalysis(BaseModel):
    """情绪分析模型"""
    emotion_journey: EmotionJourney = Field(description="情绪历程分析")
    emotional_patterns: str = Field(description="情绪变化模式及心理学意义")
    core_emotional_message: str = Field(description="梦境传达的核心情感信息")


class ContextualIntegration(BaseModel):
    """情境整合模型"""
    life_context_analysis: str = Field(description="结合个人背景的梦境意义分析")
    sleep_environment_impact: str = Field(description="睡眠质量对梦境的影响")


class KeySymbol(BaseModel):
    """关键象征模型"""
    symbol: str = Field(description="象征元素")
    universal_meaning: str = Field(description="普遍象征意义")
    personalized_interpretation: str = Field(description="个性化解读")
    emotional_resonance: str = Field(description="情感共鸣")
    life_connection: str = Field(description="与现实的联系")


class NarrativeStructure(BaseModel):
    """叙事结构模型"""
    dream_setting: str = Field(description="梦境场景的心理学意义")
    plot_development: str = Field(description="情节发展反映的内心动态")
    climax_analysis: str = Field(description="梦境高潮的深层含义")
    resolution_pattern: str = Field(description="梦境结局的心理学启示")


class SymbolicExploration(BaseModel):
    """象征探索模型"""
    key_symbols: List[KeySymbol] = Field(description="关键象征列表")
    narrative_structure: NarrativeStructure = Field(description="叙事结构分析")
    archetypal_presence: str = Field(description="荣格原型体现")


class PsychologicalInsights(BaseModel):
    """心理学洞察模型"""
    compensation_theory: str = Field(description="梦境的心理补偿功能分析")
    integration_process: str = Field(description="心理整合过程的体现")
    growth_opportunities: str = Field(description="梦境揭示的个人成长机会")
    inner_wisdom: str = Field(description="梦境传达的内在智慧")


class AlternativePerspective(BaseModel):
    """替代视角模型"""
    interpretation: str = Field(description="解释角度")
    context: str = Field(description="适用背景")


class PrimaryHypothesis(BaseModel):
    """主要假设模型"""
    interpretation: str = Field(description="主要梦境解释")
    confidence_level: str = Field(description="解释可信度")
    supporting_evidence: str = Field(description="支持证据")


class GentleInterpretations(BaseModel):
    """温和解释模型"""
    primary_hypothesis: PrimaryHypothesis = Field(description="主要假设")
    alternative_perspectives: List[AlternativePerspective] = Field(description="替代视角")
    questions_for_reflection: List[str] = Field(description="反思问题")


class TherapeuticSuggestions(BaseModel):
    """治疗建议模型"""
    immediate_actions: str = Field(description="即时行动建议")
    long_term_practices: str = Field(description="长期成长实践")
    mindfulness_approaches: str = Field(description="正念冥想建议")


class GrowthOrientedGuidance(BaseModel):
    """成长导向指导模型"""
    self_awareness_insights: str = Field(description="自我认知洞察")
    emotional_regulation: str = Field(description="情绪调节建议")
    life_integration: str = Field(description="梦境智慧的日常融入")
    therapeutic_suggestions: TherapeuticSuggestions = Field(description="治疗建议")


class ProfessionalConsiderations(BaseModel):
    """专业考虑模型"""
    theoretical_foundation: str = Field(description="心理学理论基础")
    cultural_sensitivity: str = Field(description="文化背景考量")
    limitations_acknowledgment: str = Field(description="分析局限性")
    follow_up_recommendations: str = Field(description="后续探索建议")
    professional_support_note: str = Field(description="专业咨询建议")


class EmpoweringConclusion(BaseModel):
    """赋能结论模型"""
    key_takeaways: str = Field(description="关键洞察发现")
    affirmation: str = Field(description="内在智慧肯定")
    future_orientation: str = Field(description="未来导向建议")
    closing_reflection: str = Field(description="鼓励性结语")


class DreamAnalysisResult(BaseModel):
    """梦境分析结果主模型"""
    # extra="forbid"：禁止 JSON 里出现模型未定义的字段，否则会报错。
    # validate_assignment=True：赋值时自动验证类型和约束（即使是修改已创建对象的字段）
    model_config = ConfigDict(extra="forbid", validate_assignment=True)
    
    professional_introduction: ProfessionalIntroduction
    emotional_analysis: EmotionalAnalysis
    contextual_integration: ContextualIntegration
    symbolic_exploration: SymbolicExploration
    psychological_insights: PsychologicalInsights
    gentle_interpretations: GentleInterpretations
    growth_oriented_guidance: GrowthOrientedGuidance
    professional_considerations: ProfessionalConsiderations
    empowering_conclusion: EmpoweringConclusion


class QueryExpansionResult(BaseModel):
    """查询扩展结果模型"""
    model_config = ConfigDict(extra="forbid", validate_assignment=True)
    
    primary_queries: List[str] = Field(min_length=1, max_length=3)
    query_rationale: str
