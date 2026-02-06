"""
TrustCall + LangMemory 记忆管理机制
==================================
"""

from datetime import datetime
from typing import Dict, List, Any, Optional
from uuid import uuid4

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from .config import memory_manager


class MemoryTypes:
    """梦境助手记忆类型常量"""
    SEMANTIC = "semantic"      # 语义记忆
    EPISODIC = "episodic"     # 情景记忆
    PROCEDURAL = "procedural" # 程序记忆


class LangMemoryManager:
    """
    LangMemory 记忆管理器
    
    实现TrustCall + LangMemory机制，提供智能记忆存储和检索功能。
    """
    
    def __init__(self):
        self.store = memory_manager.get_store()
        
    async def save_semantic_memory(
        self, 
        user_id: str, 
        content: str, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        保存语义记忆：用户基本信息、梦境知识、事实概念
        
        适用场景：
        - 用户基本信息（年龄、职业、文化背景等）
        - 梦境符号知识和理论
        - 用户明确表达的事实性信息
        - 不变的个人特征和基础知识
        """
        # 命名空间：采用元组形式，支持分层组织架构
        namespace = ("user_memory", user_id, MemoryTypes.SEMANTIC)
        # 键：命名空间内记忆条目的唯一标识符
        memory_id = f"semantic_{uuid4().hex[:8]}"
        
        # 值：python字典对象
        memory_data = {
            "content": content,
            "memory_type": MemoryTypes.SEMANTIC,
            "timestamp": datetime.now().isoformat(),
            **(metadata or {})
        }
        
        # 存储并启用向量索引生成embedding
        await self.store.aput(namespace, memory_id, memory_data, index=True)
        return memory_id
    
    async def save_episodic_memory(
        self, 
        user_id: str, 
        conversation_summary: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        保存情景记忆：对话历史、梦境记录、特定交互事件
        
        适用场景：
        - 重要对话内容和上下文
        - 用户描述的具体梦境
        - 特定时间点的交互事件
        - 用户在特定情境下的反应和选择
        """
        namespace = ("user_memory", user_id, MemoryTypes.EPISODIC)
        memory_id = f"episodic_{uuid4().hex[:8]}"
        
        # 准备存储数据
        memory_data = {
            "content": conversation_summary,
            "memory_type": MemoryTypes.EPISODIC,
            "timestamp": datetime.now().isoformat(),
            **(metadata or {})
        }
        
        # 存储并启用向量索引生成embedding
        await self.store.aput(namespace, memory_id, memory_data, index=True)
        return memory_id
    
    async def save_procedural_memory(
        self, 
        user_id: str, 
        task_pattern: str,
        success_context: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        保存程序记忆：用户偏好设置、行为模式、决策策略
        
        适用场景：
        - 用户偏好设置（解读风格、回复长度、功能开关等）
        - 用户行为模式（互动方式、反馈习惯、学习偏好等）
        - 决策策略（成功的交互模式、有效的解决方案等）
        - 指导Agent行为调整的规则和模式
        
        这是实现个性化服务的核心记忆类型！
        """
        namespace = ("user_memory", user_id, MemoryTypes.PROCEDURAL)
        memory_id = f"procedural_{uuid4().hex[:8]}"
        
        # 组合内容用于搜索
        content = f"任务模式: {task_pattern}\n成功上下文: {success_context}"
        
        # 准备存储数据
        memory_data = {
            "content": content,
            "memory_type": MemoryTypes.PROCEDURAL,
            "timestamp": datetime.now().isoformat(),
            **(metadata or {})
        }
        
        # 存储并启用向量索引生成embedding
        await self.store.aput(namespace, memory_id, memory_data, index=True)
        return memory_id
    
    async def search_memories(
        self, 
        user_id: str, 
        query: str, 
        memory_types: Optional[List[str]] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        语义搜索记忆，支持个性化查询
        
        搜索范围：
        - SEMANTIC: 查找用户基本信息、相关知识
        - EPISODIC: 查找历史对话、相似经历
        - PROCEDURAL: 查找用户偏好、行为模式
        """
        all_results = []
        
        search_types = memory_types or [MemoryTypes.SEMANTIC, MemoryTypes.EPISODIC, MemoryTypes.PROCEDURAL]
        
        for memory_type in search_types:
            namespace = ("user_memory", user_id, memory_type)
            results = await self.store.asearch(namespace, query=query, limit=limit)
            
            for result in results:
                # 每个result都是一个Item 类型的实例，包含value和score属性，value是存储的记忆数据，score是相似度得分
                if hasattr(result, 'value') and isinstance(result.value, dict):
                    memory_data = result.value.copy()
                    # 如果result有score属性，则将score添加到memory_data中
                    if hasattr(result, 'score'):
                        memory_data["similarity"] = result.score
                    all_results.append(memory_data)
        
        # 按相似度得分排序
        all_results.sort(key=lambda x: x.get("similarity", 0), reverse=True)
        return all_results[:limit]
    
    async def get_memory_context(
        self, 
        user_id: str, 
        current_query: str,
        include_recent: bool = True
    ) -> Dict[str, Any]:
        """
        获取完整的记忆上下文，支持个性化Agent行为调整
        """
        context = {
            "semantic_memories": [],
            "episodic_memories": [],
            "procedural_memories": []
        }
        
        # 语义搜索相关记忆
        relevant_memories = await self.search_memories(user_id, current_query, limit=10)
        
        # 分类记忆
        for memory in relevant_memories:
            memory_type = memory.get("memory_type")
            if memory_type == MemoryTypes.SEMANTIC:
                context["semantic_memories"].append(memory)
            elif memory_type == MemoryTypes.EPISODIC:
                context["episodic_memories"].append(memory)
            elif memory_type == MemoryTypes.PROCEDURAL:
                context["procedural_memories"].append(memory)
        
        return context


# 全局记忆管理器实例
lang_memory_manager = LangMemoryManager()
