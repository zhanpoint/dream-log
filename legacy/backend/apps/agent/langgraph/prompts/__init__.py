"""
提示词模块
=========

LangGraph Agent的提示词定义。
"""

# 只导出实际被其他模块使用的提示词
from .expert_knowledge import DREAM_ANALYSIS_PROMPT

__all__ = [
    "DREAM_ANALYSIS_PROMPT"
]
