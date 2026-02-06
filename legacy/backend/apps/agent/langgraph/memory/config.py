"""
LangGraph记忆系统配置
==================
"""

import logging
from typing import Optional
from dataclasses import dataclass
from config.env_manager import env_manager
from langchain_voyageai import VoyageAIEmbeddings

logger = logging.getLogger(__name__)


@dataclass
class MemoryConfig:
    """记忆系统配置"""
    postgres_url: str
    # 固定配置值
    embedding_model: str = "voyage-3.5-lite"
    embedding_dimension: int = 1024
    max_memory_items: int = 1000
    similarity_threshold: float = 0.7
    enable_semantic_search: bool = True


class MemoryManager:
    """记忆系统管理器"""
    
    def __init__(self):
        self._config = None
        self._embedding_service = None
        self._checkpointer = None
        self._store = None
        
    @property
    def config(self) -> MemoryConfig:
        """获取记忆持久化数据库配置"""
        if self._config is None:
            postgres_url = env_manager.langgraph.connection_url
            
            self._config = MemoryConfig(postgres_url=postgres_url)
        return self._config
    
    def get_embedding_service(self):
        """获取embedding服务"""
        if self._embedding_service is None:
            voyage_api_key = env_manager.ai_services.api_keys.get('voyage_api_key')
            if not voyage_api_key:
                raise ValueError("VOYAGE_API_KEY is required for embedding service")
            
            self._embedding_service = VoyageAIEmbeddings(
                model=self.config.embedding_model,
                voyage_api_key=voyage_api_key,
            )
        return self._embedding_service
    
    def get_checkpointer(self):
        """获取短期记忆（Checkpointer）"""
        if self._checkpointer is None:
            from langgraph.checkpoint.postgres import PostgresSaver
            
            self._checkpointer = PostgresSaver.from_conn_string(self.config.postgres_url)
            self._checkpointer.setup()
            logger.info("PostgreSQL Checkpointer initialized successfully")
        return self._checkpointer
    
    def get_store(self):
        """获取长期记忆（Store）- 配置向量索引支持"""
        if self._store is None:
            from langgraph.store.postgres import PostgresStore
            
            # 获取embedding服务用于向量索引
            embedding_service = self.get_embedding_service()
            
            # 创建带向量索引配置的Store
            self._store = PostgresStore.from_conn_string(
                self.config.postgres_url,
                index={
                    "dims": self.config.embedding_dimension,  # 向量维度
                    "embed": embedding_service.embed_query,   # embedding函数
                }
            )
            
            self._store.setup()
            logger.info("PostgreSQL Store with vector index initialized successfully")
        return self._store


# 全局记忆管理器实例，支持延迟加载
memory_manager = MemoryManager()