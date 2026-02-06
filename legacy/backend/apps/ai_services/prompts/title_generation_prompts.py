"""
梦境标题生成Prompt模板
基于梦境内容生成简洁且富有创意的标题
"""
from langchain_core.prompts import PromptTemplate


class TitleGenerationPrompts:
    """标题生成提示词管理类"""
    
    # 梦境标题生成主要提示模板
    TITLE_GENERATION_PROMPT_TEMPLATE = """
作为一名资深的解梦专家和富有创意的作家，请为以下梦境内容生成一个引人入胜且简洁的标题。

**核心指令:**
1.  **精准捕捉核心**: 标题需精准捕捉梦境的核心主题、最突出的象征或最强烈的情感。
2.  **创意与意象**: 使用生动、富有想象力的语言，可以带有一点诗意或神秘感，但要避免晦涩难懂。
3.  **简洁有力**: 标题长度严格控制在 5 到 15 个汉字之间。
4.  **格式要求**: 最终只返回生成的标题文本，不要包含任何额外的说明、引号或标签（例如 "标题："）。

**梦境内容:**
{dream_content}

**生成的标题:**
""".strip()
    
    @classmethod
    def create_title_generation_prompt(cls) -> PromptTemplate:
        """创建梦境标题生成Prompt实例"""
        return PromptTemplate.from_template(cls.TITLE_GENERATION_PROMPT_TEMPLATE)
