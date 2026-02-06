"""
对话标题生成Prompt模板
基于对话内容生成简洁且合适的标题
"""
from langchain_core.prompts import PromptTemplate


class ConversationTitlePrompts:
    """对话标题生成提示词管理类"""
    
    # 对话标题生成主要提示模板
    CONVERSATION_TITLE_PROMPT_TEMPLATE = """
为用户的这条消息生成一个简洁的对话标题。

**要求:**
1. **字数限制**: 严格控制在30字以内（包含标点符号）
2. **核心概括**: 提取用户消息的核心主题和关键词
3. **语言一致性**: 用户是中文就用中文，英文就用英文
4. **直接输出**: 只返回标题，不要任何前缀或说明

**用户消息:**
{conversation_content}

**标题:**
""".strip()
    
    @classmethod
    def create_conversation_title_prompt(cls) -> PromptTemplate:
        """创建对话标题生成Prompt实例"""
        return PromptTemplate.from_template(cls.CONVERSATION_TITLE_PROMPT_TEMPLATE)
