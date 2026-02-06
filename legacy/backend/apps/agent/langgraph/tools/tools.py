"""
LangChain 标准工具定义
======================

使用 @tool 装饰器定义梦境助手可用的工具函数，基于 Pydantic 模型自动生成参数模式
遵循 LangChain 最佳实践，支持自动类型推断和参数验证。
"""

from pydantic import BaseModel, Field
from langchain_core.tools import tool
from config.env_manager import env_manager


class WebSearchInput(BaseModel):
    """网络搜索工具输入参数"""
    query: str = Field(..., description="搜索关键词或问题", min_length=1, max_length=200)


class WeatherQueryInput(BaseModel):
    """天气查询工具输入参数"""
    location: str = Field(..., description="城市名称或地理位置", min_length=1, max_length=100)


@tool(args_schema=WebSearchInput)
async def web_search(query: str) -> str:
    """搜索互联网获取最新信息，适用于查找实时资讯、新闻、研究资料等。"""
    api_keys = env_manager.ai_services.api_keys
    tavily_key = api_keys.get('tavily_api_key')
    
    from langchain_community.tools.tavily_search import TavilySearchResults
    
    search_tool = TavilySearchResults(api_key=tavily_key, max_results=3)
    results = await search_tool.ainvoke({"query": query})
    
    if isinstance(results, list):
        formatted_results = []
        for result in results:
            if isinstance(result, dict):
                title = result.get("title", "无标题")
                content = result.get("content", result.get("snippet", ""))
                url = result.get("url", "")
                formatted_results.append(f"**{title}**\n{content}\n来源: {url}")
            else:
                formatted_results.append(str(result))
        return "\n\n".join(formatted_results)
    
    return str(results)


@tool(args_schema=WeatherQueryInput)
async def weather_query(location: str) -> str:
    """查询指定地点的当前天气信息，包括温度、湿度、天气状况等。"""
    api_keys = env_manager.ai_services.api_keys
    weather_key = api_keys.get('openweathermap_api_key')
    
    from langchain_community.utilities.openweathermap import OpenWeatherMapAPIWrapper
    from langchain_community.tools.openweathermap.tool import OpenWeatherMapQueryRun
    
    wrapper = OpenWeatherMapAPIWrapper(openweathermap_api_key=weather_key)
    weather_tool = OpenWeatherMapQueryRun(api_wrapper=wrapper)
    result = await weather_tool.ainvoke({"location": location})
    
    return str(result)


# 工具列表
AVAILABLE_TOOLS = [
    web_search,
    weather_query,
]


def get_all_tools():
    """获取所有可用工具列表"""
    return AVAILABLE_TOOLS
