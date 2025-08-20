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

# 嵌入模型
EMBEDDING_MODEL=config('EMBEDDING_MODEL', default='voyage-3.5-lite', cast=str)

# Tavily搜索API配置
TAVILY_API_KEY = config('TAVILY_API_KEY', default='', cast=str)

# Firecrawl API配置  
FIRECRAWL_API_KEY = config('FIRECRAWL_API_KEY', default='', cast=str)

# VoyageAI API配置（用于重排序）
VOYAGE_API_KEY = config('VOYAGE_API_KEY', default='', cast=str)

# RAG功能开关
RAG_ENABLED = config('RAG_ENABLED', default=True, cast=bool)

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

def _apply_proxy_settings() -> None:
	"""以不覆盖既有环境变量的方式注入代理配置。
	优先使用外部（如 docker-compose）提供的 HTTP_PROXY/HTTPS_PROXY，
	若不存在则退回到 PROXY_URL。"""
	if 'HTTP_PROXY' in os.environ or 'HTTPS_PROXY' in os.environ:
		# 外部已提供，保持不变
		return
	if not PROXY_URL:
		return
	os.environ.setdefault('HTTP_PROXY', PROXY_URL)
	os.environ.setdefault('HTTPS_PROXY', PROXY_URL)
	os.environ.setdefault('http_proxy', PROXY_URL)
	os.environ.setdefault('https_proxy', PROXY_URL)
	os.environ.setdefault('NO_PROXY', 'localhost,127.0.0.1,::1')


class LLMManager:
    """LLM管理器 - 遵循单例模式和场景特定配置的最佳实践"""
    
    def __init__(self):
        self._llm_instances: Dict[LLMScenario, Optional[ChatOpenAI]] = {}
        self._initialized = False
        # 优先注入代理环境变量，避免 httpx 版本差异
        _apply_proxy_settings()
        # 设置各场景的LLM配置参数
        self._setup_scenario_configs()
    
    def _setup_scenario_configs(self):
        """设置各场景的LLM配置参数"""
        models = [model.strip() for model in (OPENROUTER_MODELS or '').split(',') if model and model.strip()]
        primary_model = models[0] if models else "google/gemini-2.5-flash-lite"
        
        self.scenario_configs = {
            # 梦境深度分析 - 需要高创造性、详细输出
            LLMScenario.DREAM_ANALYSIS: LLMConfig(
                model=primary_model,
                temperature=0.75,
                top_p=0.85,
                max_tokens=5120,
                presence_penalty=0.3,
                frequency_penalty=0.2,
                response_format={"type": "json_object"},
                description="梦境深度分析 - 高创造性、详细输出"
            ),
            
            # RAG查询扩展 - 需要精确、结构化
            LLMScenario.QUERY_EXPANSION: LLMConfig(
                model=primary_model,
                temperature=0.25,
                top_p=0.8,
                max_tokens=256,
                presence_penalty=0.1,
                frequency_penalty=0.1,
                response_format={"type": "json_object"},
                description="RAG查询扩展 - 快速、精确的查询生成"
            ),
            
            # AI标题生成 - 需要简洁、准确
            LLMScenario.TITLE_GENERATION: LLMConfig(
                model=primary_model,
                temperature=0.6,
                top_p=0.85,
                max_tokens=128,
                presence_penalty=0.1,
                frequency_penalty=0.1,
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
                model_kwargs=model_kwargs,
                timeout=15
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