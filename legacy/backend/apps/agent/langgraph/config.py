"""
LangGraph Agent专用配置模块
====================

用于管理LangGraph梦境助手Agent的LLM配置，实现配置分离。
基于场景优化的LLM参数配置，确保不同节点使用最适合的LLM设置。
"""

import os
import logging
from typing import Optional
from dataclasses import dataclass
from enum import Enum
from config.env_loader import env
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)


class AgentScenario(Enum):
    """LangGraph Agent使用场景枚举"""
    INTENT_ANALYSIS = "intent_analysis"        # 意图理解节点
    RESPONSE_GENERATION = "response_generation"  # 响应生成节点
    EXPERT_KNOWLEDGE = "expert_knowledge"      # 专业知识节点
    COMPLETION_CHECK = "completion_check"      # 完成检查节点


@dataclass
class AgentLLMConfig:
    """Agent LLM配置参数"""
    model: str  # 模型
    temperature: float  # 温度
    top_p: float  # 上采样
    max_tokens: int  # 最大tokens
    presence_penalty: float = 0.0  # 出现惩罚
    frequency_penalty: float = 0.0  # 频率惩罚


def apply_proxy() -> None:
    """应用代理设置"""
    proxy = env('PROXY_URL')

    if not proxy:
        return
        
    for key in ("http_proxy", "https_proxy"):
        os.environ[key] = proxy
        os.environ[key.upper()] = proxy


class AgentLLMManager:
    """Agent专用LLM管理器 - 单例模式"""
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._llm_instances = {}
            apply_proxy()
            self._initialized = True
    
    @property
    def scenario_configs(self) -> dict[AgentScenario, AgentLLMConfig]:
        """场景配置字典"""
        return {
            AgentScenario.INTENT_ANALYSIS: AgentLLMConfig(
                model="google/gemini-2.5-flash-lite", temperature=0.0, top_p=0.7, max_tokens=256,
                presence_penalty=0.0, frequency_penalty=0.0
            ),
            AgentScenario.RESPONSE_GENERATION: AgentLLMConfig(
                model="google/gemini-2.5-flash-lite", temperature=0.8, top_p=0.95, max_tokens=2048,
                presence_penalty=0.3, frequency_penalty=0.2
            ),
            AgentScenario.EXPERT_KNOWLEDGE: AgentLLMConfig(
                model="google/gemini-2.5-flash-lite", temperature=0.3, top_p=0.8, max_tokens=1536,
                presence_penalty=0.1, frequency_penalty=0.1
            ),
            AgentScenario.COMPLETION_CHECK: AgentLLMConfig(
                model="google/gemini-2.5-flash-lite", temperature=0.0, top_p=0.7, max_tokens=512,
                presence_penalty=0.0, frequency_penalty=0.0
            )
        }
    
    def get_llm(self, scenario: AgentScenario) -> Optional[ChatOpenAI]:
        """获取LLM实例"""
        api_key = env('OPENROUTER_API_KEY')
        if not api_key:
            logger.error("OPENROUTER_API_KEY not set")
            return None
        
        if scenario in self._llm_instances:
            return self._llm_instances[scenario]
        
        try:
            config = self.scenario_configs.get(scenario)
            if not config:
                logger.error(f"No config for scenario {scenario}")
                return None
            
            llm = ChatOpenAI(
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
                model=config.model,
                temperature=config.temperature,
                top_p=config.top_p,
                max_tokens=config.max_tokens,
                presence_penalty=config.presence_penalty,
                frequency_penalty=config.frequency_penalty,
                timeout=15
            )
            
            self._llm_instances[scenario] = llm
            return llm
            
        except Exception as e:
            logger.error(f"Failed to create LLM for {scenario}: {e}")
            return None
    
    @classmethod
    def get_scenario_llm(cls, scenario: AgentScenario) -> Optional[ChatOpenAI]:
        """类方法获取场景LLM"""
        return cls().get_llm(scenario)


# 简化的获取函数
def get_intent_analysis_llm() -> Optional[ChatOpenAI]:
    return AgentLLMManager.get_scenario_llm(AgentScenario.INTENT_ANALYSIS)

def get_response_generation_llm() -> Optional[ChatOpenAI]:
    return AgentLLMManager.get_scenario_llm(AgentScenario.RESPONSE_GENERATION)

def get_expert_knowledge_llm() -> Optional[ChatOpenAI]:
    return AgentLLMManager.get_scenario_llm(AgentScenario.EXPERT_KNOWLEDGE)

def get_completion_check_llm() -> Optional[ChatOpenAI]:
    return AgentLLMManager.get_scenario_llm(AgentScenario.COMPLETION_CHECK)

