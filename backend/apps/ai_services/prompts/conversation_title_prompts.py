"""
对话标题生成Prompt模板
基于对话内容生成简洁且合适的标题
"""
from langchain_core.prompts import PromptTemplate


class ConversationTitlePrompts:
    """对话标题生成提示词管理类"""
    
    # 对话标题生成主要提示模板
    CONVERSATION_TITLE_PROMPT_TEMPLATE = """
作为一名资深的内容摘要专家，请为以下对话内容生成一个简洁且合适的标题。

**核心指令:**
1. **精准捕捉主题**: 标题需要准确概括对话的核心主题、关键问题或主要讨论内容。
2. **语言一致性**: 根据对话的主要语言生成对应语言的标题（中文对话生成中文标题，英文对话生成英文标题）。
3. **简洁明了**: 标题长度控制在3-8个词语或5-15个汉字，便于在侧边栏展示。
4. **主题概括**: 优先提取具体的主题词汇，如梦境元素、提问重点或讨论焦点。
5. **格式要求**: 只返回标题文本，不包含任何前缀、引号或说明文字。

**对话内容:**
{conversation_content}

**生成的标题:**
""".strip()
    
    @classmethod
    def create_conversation_title_prompt(cls) -> PromptTemplate:
        """创建对话标题生成Prompt实例"""
        return PromptTemplate.from_template(cls.CONVERSATION_TITLE_PROMPT_TEMPLATE)
