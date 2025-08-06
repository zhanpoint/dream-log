import logging
from functools import lru_cache
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from . import config

logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_vectorstore():
    """
    获取向量数据库的单例。
    使用 lru_cache 确保在整个应用生命周期中只初始化一次。
    """
    try:
        logger.info(f"正在从路径加载向量数据库: {config.VECTORSTORE_PATH}")
        embeddings = OpenAIEmbeddings(model=config.OPENAI_EMBEDDING_MODEL_NAME)
        vectorstore = Chroma(
            persist_directory=config.VECTORSTORE_PATH,
            embedding_function=embeddings
        )
        logger.info("向量数据库加载成功。")
        return vectorstore
    except Exception as e:
        logger.error(f"加载向量数据库失败: {e}", exc_info=True)
        # 在生产环境中，您可能希望在这里抛出异常或采取其他恢复措施
        return None

def get_retriever(search_type="similarity", search_kwargs={"k": 5}):
    """
    获取一个配置好的检索器。
    """
    vectorstore = get_vectorstore()
    if vectorstore:
        return vectorstore.as_retriever(
            search_type=search_type,
            search_kwargs=search_kwargs
        )
    return None
