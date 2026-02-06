"""
工具注册表
==========

基于 LangChain @tool 装饰器的工具注册系统，
支持自动发现和统一管理标准 LangChain 工具。
"""

from typing import List, Dict, Any


class ToolRegistry:
    """工具注册表，基于 LangChain 标准工具"""
    
    def __init__(self):
        self._tools = None
    
    def _initialize_tools(self):
        """初始化工具列表"""
        if self._tools is None:
            from .tools import get_all_tools
            self._tools = get_all_tools()
    
    def get_tool_by_name(self, tool_name: str):
        """根据名称获取工具实例"""
        self._initialize_tools()
        for tool in self._tools:
            if tool.name == tool_name:
                return tool
        return None
    
    def format_tools_for_llm(self) -> str:
        """格式化工具信息供 LLM 使用，包含 Pydantic 参数验证规则"""
        self._initialize_tools()
        if not self._tools:
            return "无可用工具"
        
        formatted_tools = []
        for tool in self._tools:
            schema = tool.args_schema.model_json_schema() if tool.args_schema else {}
            properties = schema.get("properties", {})
            required = schema.get("required", [])
            
            # 提取参数信息，包含约束规则
            params_desc = []
            for param_name, param_info in properties.items():
                param_type = param_info.get("type", "unknown")
                param_desc = param_info.get("description", "无描述")
                is_required = "必填" if param_name in required else "可选"
                params_desc.append(f"  - {param_name} ({param_type}, {is_required}): {param_desc}")
            
            formatted_tools.append(f"""工具名称: {tool.name}
功能描述: {tool.description}
参数说明:
{chr(10).join(params_desc) if params_desc else "  无参数"}""")
        
        return "\n\n".join(formatted_tools)


# 全局工具注册表实例
tool_registry = ToolRegistry()


def get_tool_registry() -> ToolRegistry:
    """获取工具注册表实例"""
    return tool_registry
