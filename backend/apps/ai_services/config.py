import os
import logging
from decouple import config
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)

# OpenRouter
OPENROUTER_API_KEY = config('OPENROUTER_API_KEY', default='', cast=str)
OPENROUTER_MODELS = config(
    'OPENROUTER_MODELS'
)
# OpenRouter的Base URL
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

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


def get_llm():
    """
    获取配置好的LLM实例
    推荐使用OpenRouter，因为它提供了更灵活的模型选择和路由功能
    """
    if not OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY not set. Cannot initialize LLM.")
        return None
        
    try:
        models = [model.strip() for model in OPENROUTER_MODELS.split(',')]
        
        llm = ChatOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            model=models[0],
            temperature=0.75,
            top_p=0.9,
            max_tokens=1024,
        )
        logger.info(f"ChatOpenAI for OpenRouter initialized with model: {models[0]}")
        return llm
        
    except ImportError:
        logger.error("langchain_openai not installed. Please run: pip install langchain-openai")
        return None
    except Exception as e:
        logger.error(f"Failed to initialize ChatOpenAI for OpenRouter: {e}", exc_info=True)
        return None
