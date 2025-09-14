"""
梦境助手 LangGraph 状态定义
"""
from typing import TypedDict, List, Optional, Literal, Dict, Any
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field


class UserIntent(BaseModel):
    """用户意图分析结果"""
    intent_type: Literal["interpret_dream", "ask_knowledge", "generate_image", "casual_chat"]
    confidence: float = Field(ge=0.0, le=1.0)
    keywords: List[str] = Field(default_factory=list)
    context: Optional[str] = None


class DreamInterpretation(BaseModel):
    """梦境解读结果"""
    psychological: Optional[str] = None  # 心理学解读
    symbolic: Optional[str] = None       # 象征学解读
    biological: Optional[str] = None     # 生物医学解读
    spiritual: Optional[str] = None      # 灵性解读
    personal_growth: Optional[str] = None # 个人成长解读
    summary: str                         # 综合总结
    key_elements: List[str] = Field(default_factory=list)  # 关键元素
    follow_up_questions: List[str] = Field(default_factory=list)  # 追问问题


class ImageGenerationRequest(BaseModel):
    """图像生成请求"""
    description: str
    style: str = "梦幻超现实主义"
    keywords: List[str] = Field(default_factory=list)
    
    
class OverallState(TypedDict):
    """
    梦境助手的全局状态结构体
    """     
    user_id: str  # 用户ID
    chat_id: str  # 聊天ID
    message_id: str  # 消息ID
    
    messages: List[BaseMessage]  # 对话历史
    
    user_input: str
    user_images: List[str]  # 用户上传的图片URLs
    
    # 意图分析
    user_intent: Optional[UserIntent]
    
    # 记忆和上下文（现使用LangGraph Store）
    retrieved_memories: List[Dict[str, Any]]  # 记忆数据改为字典格式
    current_session_context: List[Dict[str, Any]]
    user_preferences: Dict[str, Any]  # 从 AIConfig 加载的用户偏好
    
    # 各节点的处理结果
    dream_interpretation: Optional[DreamInterpretation]
    knowledge_answer: Optional[str]
    generated_image_url: Optional[str]
    image_generation_request: Optional[ImageGenerationRequest]
    
    # 流程控制
    next_node: Optional[str]  # 下一个要执行的节点
    should_continue: bool  # 是否继续对话循环
    iteration_count: int  # 当前对话轮次
    max_iterations: int  # 最大对话轮次（防止无限循环）
    
    # 最终输出
    final_response: Optional[str]
    response_metadata: Dict[str, Any]  # 响应的元数据（如使用的模型、耗时等）
    
    # 错误处理
    error: Optional[str]
    
    # 临时工作空间
    workspace: Dict[str, Any]  # 各节点可以使用的临时存储空间
    
    # 流式传输字段
    streaming_content: Optional[str]  # 当前正在流式传输的内容