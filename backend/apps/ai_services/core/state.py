from typing import TypedDict, List
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    """
    定义 Agent 在 LangGraph 中流转的状态
    """
    # 用户输入的原始问题
    input: str
    
    # 聊天记录
    chat_history: List[BaseMessage]
    
    # Agent 执行的中间步骤
    intermediate_steps: list
    
    # Agent 的最终回答
    generation: str
    
    # 检索到的文档
    documents: List[str]
