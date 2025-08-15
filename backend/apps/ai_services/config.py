import os
import logging
from typing import Dict, Optional
from dataclasses import dataclass
from enum import Enum
from decouple import config
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)


class LLMScenario(Enum):
    """LLM使用场景枚举"""
    DREAM_ANALYSIS = "dream_analysis"      # 梦境深度分析
    QUERY_EXPANSION = "query_expansion"    # RAG查询扩展  
    TITLE_GENERATION = "title_generation"  # AI标题生成


@dataclass
class LLMConfig:
    """LLM配置参数"""
    model: str
    temperature: float
    top_p: float
    max_tokens: int
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0
    description: str = ""
    response_format: Optional[Dict] = None  # JSON格式控制参数

# OpenRouter
OPENROUTER_API_KEY = config('OPENROUTER_API_KEY', default='', cast=str)
OPENROUTER_MODELS = config(
    'OPENROUTER_MODELS'
)
# OpenRouter的Base URL
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Tavily搜索API配置
TAVILY_API_KEY = config('TAVILY_API_KEY', default='', cast=str)

# Firecrawl API配置  
FIRECRAWL_API_KEY = config('FIRECRAWL_API_KEY', default='', cast=str)

# Cohere API配置（用于重排序）
COHERE_API_KEY = config('COHERE_API_KEY', default='', cast=str)

# Google Gemini配置
GOOGLE_API_KEY = config('GOOGLE_API_KEY', default='', cast=str)
GEMINI_EMBEDDING_MODEL = config('GEMINI_EMBEDDING_MODEL', default='models/embedding-001', cast=str)

# ChromaDB Cloud配置
CHROMA_CLOUD_API_KEY = config('CHROMA_CLOUD_API_KEY', default='', cast=str)
CHROMA_COLLECTION_NAME = config('CHROMA_COLLECTION_NAME', default='dream_knowledge_base', cast=str)
CHROMA_TENANT = config('CHROMA_TENANT', default='', cast=str)
CHROMA_DATABASE = config('CHROMA_DATABASE', default='dream_knowledge_base', cast=str)

# 知识库持久化URL列表文件
_current_dir = os.path.dirname(os.path.abspath(__file__))
PROCESSED_URLS_FILE_PATH = os.path.join(_current_dir, 'knowledge_base', 'data', 'processed_urls.json')

# 代理配置
PROXY_URL = config('PROXY_URL', default=None)

# LangSmith Tracing (optional)
# LANGCHAIN_TRACING_V2 = config('LANGCHAIN_TRACING_V2', default='true')
# LANGCHAIN_API_KEY = config('LANGCHAIN_API_KEY', default='')
# LANGCHAIN_PROJECT = config('LANGCHAIN_PROJECT', default='DreamLog-Project')

# def _setup_langsmith():
#     """配置LangSmith环境"""
#     os.environ['LANGCHAIN_TRACING_V2'] = LANGCHAIN_TRACING_V2
#     os.environ['LANGCHAIN_API_KEY'] = LANGCHAIN_API_KEY
#     os.environ['LANGCHAIN_PROJECT'] = LANGCHAIN_PROJECT
#     logger.info(f"LangSmith Tracing is {'enabled' if LANGCHAIN_TRACING_V2 == 'true' else 'disabled'}")

# _setup_langsmith()


class LLMManager:
    """LLM管理器 - 遵循单例模式和场景特定配置的最佳实践"""
    
    def __init__(self):
        self._llm_instances: Dict[LLMScenario, Optional[ChatOpenAI]] = {}
        self._initialized = False
        # 设置各场景的LLM配置参数
        self._setup_scenario_configs()
    
    def _setup_scenario_configs(self):
        """设置各场景的LLM配置参数"""
        models = [model.strip() for model in (OPENROUTER_MODELS or '').split(',') if model and model.strip()]
        primary_model = models[0] if models else "google/gemini-2.5-flash-lite"
        
        self.scenario_configs = {
            # 梦境深度分析 - 需要高创造性、详细输出（性能优化版）
            LLMScenario.DREAM_ANALYSIS: LLMConfig(
                model=primary_model,
                temperature=0.75,           # 适度降低温度以提高响应速度
                top_p=0.85,               # 稍微降低以减少计算复杂度
                max_tokens=6144,          # 减少到7K以提高速度，仍足够详细分析
                presence_penalty=0.3,     # 降低惩罚值，减少计算开销
                frequency_penalty=0.2,    # 降低频率惩罚，优化性能
                response_format={"type": "json_object"},  # 强制JSON输出格式
                description="梦境深度分析 - 平衡创造性与性能"
            ),
            
            # RAG查询扩展 - 需要精确、结构化（性能优化版）
            LLMScenario.QUERY_EXPANSION: LLMConfig(
                model=primary_model,
                temperature=0.25,          # 进一步降低温度，提高确定性和速度
                top_p=0.8,               # 更严格的词汇选择，减少计算
                max_tokens=256,          # 减少到256，查询扩展不需要太长
                presence_penalty=0.1,    # 不惩罚重复，减少计算
                frequency_penalty=0.1,   # 去除频率惩罚，优化速度
                response_format={"type": "json_object"},  # 强制JSON输出格式
                description="RAG查询扩展 - 快速、精确的查询生成"
            ),
            
            # AI标题生成 - 需要简洁、准确
            LLMScenario.TITLE_GENERATION: LLMConfig(
                model=primary_model,
                temperature=0.6,         # 中等温度，平衡创意和准确性
                top_p=0.85,             # 适中的词汇选择范围
                max_tokens=128,         # 小输出长度，标题要简洁
                presence_penalty=0.1,   # 轻微惩罚重复，鼓励标题多样性
                frequency_penalty=0.1,  # 轻微频率惩罚，避免标题套路化
                description="AI标题生成 - 简洁、创意、准确"
            )
        }
        self._initialized = True
    
    def get_llm_for_scenario(self, scenario: LLMScenario) -> Optional[ChatOpenAI]:
        """
        获取特定场景的LLM实例（单例模式）
        
        Args:
            scenario: LLM使用场景
            
        Returns:
            配置好的ChatOpenAI实例，失败时返回None
        """
        if not self._initialized:
            logger.error("LLMManager not initialized properly")
            return None
            
        if not OPENROUTER_API_KEY:
            logger.error("OPENROUTER_API_KEY not set. Cannot initialize LLM.")
            return None
        
        # 检查是否已有缓存的实例
        if scenario in self._llm_instances and self._llm_instances[scenario] is not None:
            return self._llm_instances[scenario]
        
        # 创建新的LLM实例
        try:
            config_obj = self.scenario_configs.get(scenario)
            if not config_obj:
                logger.error(f"No config found for scenario {scenario}")
                return None
            
            # --- 显式代理配置  ---
            import httpx
            http_client = None
            if PROXY_URL:
                proxies = {"http://": PROXY_URL, "https://": PROXY_URL}
                http_client = httpx.Client(proxies=proxies)
            # --------------------------

            # 将response_format移动到model_kwargs中以避免警告
            model_kwargs = {}
            if config_obj.response_format:
                model_kwargs['response_format'] = config_obj.response_format
            
            llm = ChatOpenAI(
                api_key=OPENROUTER_API_KEY,
                base_url=OPENROUTER_BASE_URL,
                model=config_obj.model,
                temperature=config_obj.temperature,
                top_p=config_obj.top_p,
                max_tokens=config_obj.max_tokens,
                presence_penalty=config_obj.presence_penalty,
                frequency_penalty=config_obj.frequency_penalty,
                http_client=http_client,  # 显式传递代理客户端
                model_kwargs=model_kwargs,
                timeout=15  # 降低超时时间以快速识别问题
            )
            
            # 缓存实例
            self._llm_instances[scenario] = llm
            
            return llm
            
        except ImportError:
            logger.error("langchain_openai not installed. Please run: pip install langchain-openai")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize LLM for scenario {scenario}: {e}", exc_info=True)
            return None
    



# 全局LLM管理器实例（单例）
_llm_manager = LLMManager()


def get_dream_analysis_llm() -> Optional[ChatOpenAI]:
    """获取梦境分析专用LLM实例"""
    return _llm_manager.get_llm_for_scenario(LLMScenario.DREAM_ANALYSIS)


def get_query_expansion_llm() -> Optional[ChatOpenAI]:
    """获取查询扩展专用LLM实例"""
    return _llm_manager.get_llm_for_scenario(LLMScenario.QUERY_EXPANSION)


def get_title_generation_llm() -> Optional[ChatOpenAI]:
    """获取标题生成专用LLM实例"""
    return _llm_manager.get_llm_for_scenario(LLMScenario.TITLE_GENERATION)