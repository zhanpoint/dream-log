"""
梦境分析输出结构化模型
基于Pydantic 2的现代化验证和序列化
"""

from .dream_analysis_schemas import (
    DreamAnalysisResult,
    QueryExpansionResult,
    KeySymbol,
    AlternativePerspective
)

__all__ = [
    'DreamAnalysisResult',
    'QueryExpansionResult',
    'KeySymbol', 
    'AlternativePerspective'
]
