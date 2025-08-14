"""
AI Services层
提供核心业务逻辑封装，遵循Django最佳实践
"""
from .dream_analysis_service import (
    DreamAnalysisService,
    get_dream_analysis_service
)
from .generate_dream_title import (
    DreamTitleGenerationService,
    get_dream_title_service
)

__all__ = [
    'DreamAnalysisService',
    'get_dream_analysis_service',
    'DreamTitleGenerationService', 
    'get_dream_title_service'
]
