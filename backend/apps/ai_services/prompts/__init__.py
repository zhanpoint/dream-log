"""
Prompt模板管理
集中管理所有AI服务的提示词模板
"""
from .dream_analysis_prompts import DreamAnalysisPrompts
from .title_generation_prompts import TitleGenerationPrompts
from .knowledge_base_search_prompts import DreamSearchCategory, DreamSearchTemplates

__all__ = [
    'DreamAnalysisPrompts',
    'TitleGenerationPrompts', 
    'DreamSearchCategory',
    'DreamSearchTemplates'
]