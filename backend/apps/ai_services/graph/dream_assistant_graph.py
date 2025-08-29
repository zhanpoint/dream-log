"""
梦境助手 LangGraph 主图定义
基于PostgreSQL的持久化存储实现（遵循官方最佳实践）
"""
import logging
import uuid
from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage
from decouple import config

from ..graph.dream_assistant_state import DreamAssistantState
from ..agents.orchestrator import DreamAssistantOrchestrator
from ..agents.interpreter import DreamInterpreter
from ..agents.scholar import DreamScholar
from ..agents.visualizer import DreamVisualizer
from ..agents.response_generator import ResponseGenerator

logger = logging.getLogger(__name__)

# PostgreSQL 配置
def get_langgraph_db_url():
    """构建LangGraph专用的数据库连接URL"""
    return (
        f"postgresql://{config('LANGGRAPH_DB_USER', default='postgres')}:"
        f"{config('LANGGRAPH_DB_PASSWORD', default='password')}@"
        f"{config('LANGGRAPH_DB_HOST', default='localhost')}:"
        f"{config('LANGGRAPH_DB_PORT', default='5432')}/"
        f"{config('LANGGRAPH_DB_NAME', default='langgraph_db')}"
    )


class DreamAssistantGraph:
    """梦境助手的 LangGraph 实现，基于PostgreSQL的生产级持久化存储"""
    
    def __init__(self):
        # 初始化所有节点
        self.orchestrator = DreamAssistantOrchestrator()
        self.interpreter = DreamInterpreter()
        self.scholar = DreamScholar()
        self.visualizer = DreamVisualizer()
        self.response_generator = ResponseGenerator()
        
        # PostgreSQL存储组件
        self.checkpointer = None
        self.store = None
        self.connection_pool = None
        self.app = None
        self._initialized = False
        
        # 构建图结构（不包含存储层）
        self.graph = self._build_graph()
    
    async def _initialize_postgres_components(self):
        """初始化PostgreSQL存储组件（遵循LangGraph官方最佳实践）"""
        if self._initialized:
            return
            
        try:
            # 导入正确的依赖（按官方源码结构：异步类在 aio 子模块）
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            from langgraph.store.postgres.aio import AsyncPostgresStore
            from psycopg_pool import AsyncConnectionPool
            from psycopg.rows import dict_row
            
            # 获取数据库连接URL
            db_url = get_langgraph_db_url()
            
            # 创建连接池（官方推荐方式）
            self.connection_pool = AsyncConnectionPool(
                conninfo=db_url,
                min_size=1,
                max_size=10,
                open=False,
                kwargs={  # setup() 内含 CREATE INDEX CONCURRENTLY，在事务控制中会失败，导致表/索引未落地，
                    "autocommit": True,  # 使每条 SQL 语句在独立的事务中执行，适用于不需要事务控制的操作
                    "row_factory": dict_row  # 将查询结果的每一行数据转换为字典形式，方便通过列名访问数据
                }
            )
            
            # 等待连接池开启
            await self.connection_pool.open()
            
            # 创建存储实例（正确方式）
            self.checkpointer = AsyncPostgresSaver(self.connection_pool)
            self.store = AsyncPostgresStore(self.connection_pool)
            
            # 设置数据库表结构
            await self._setup_database_tables()
            
            # 编译图并注入存储组件
            self.app = self.graph.compile(
                checkpointer=self.checkpointer,
                store=self.store
            )
            
            self._initialized = True
            logger.info("✅ PostgreSQL存储组件初始化成功")
            
        except ImportError as e:
            logger.error(f"❌ 缺少依赖包: {e}")
            await self._fallback_to_memory_storage()
            
        except Exception as e:
            logger.error(f"❌ PostgreSQL初始化失败: {e}")
            await self._fallback_to_memory_storage()
    
    async def _setup_database_tables(self):
        """设置LangGraph所需的数据库表"""
        try:
            # 创建checkpointer表
            await self.checkpointer.setup()
            logger.info("✅ LangGraph checkpointer表创建成功")
            
            # 创建store表  
            await self.store.setup()
            logger.info("✅ LangGraph store表创建成功")
            
        except Exception as e:
            # 如果表已存在，这是正常的
            if "already exists" in str(e).lower():
                logger.info("📋 LangGraph数据库表已存在，跳过创建")
            else:
                logger.warning(f"⚠️ 数据库表设置警告: {e}")
    
    async def _fallback_to_memory_storage(self):
        """降级到内存存储（仅开发环境）"""
        logger.warning("🔄 降级到内存存储模式...")
        
        from langgraph.checkpoint.memory import MemorySaver
        from langgraph.store.memory import InMemoryStore
        
        self.checkpointer = MemorySaver()
        self.store = InMemoryStore()
        self.app = self.graph.compile(
            checkpointer=self.checkpointer,
            store=self.store
        )
        
        self._initialized = True
        logger.warning("⚠️ 使用内存存储模式，重启后数据将丢失")
    
    async def _cleanup_connections(self):
        """清理数据库连接"""
        try:
            if self.connection_pool:
                await self.connection_pool.close()
                logger.info("🔌 PostgreSQL连接池已关闭")
        except Exception as e:
            logger.error(f"关闭连接池失败: {e}")
    
    def __del__(self):
        """析构函数，确保连接池正确关闭"""
        if self.connection_pool:
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                if not loop.is_closed():
                    loop.create_task(self._cleanup_connections())
            except Exception:
                pass
    
    def _build_graph(self) -> StateGraph:
        """构建 LangGraph 状态图"""
        # 创建图
        workflow = StateGraph(DreamAssistantState)
        
        # 添加节点
        workflow.add_node("orchestrator", self.orchestrator)
        workflow.add_node("interpreter", self.interpreter)
        workflow.add_node("scholar", self.scholar)
        workflow.add_node("visualizer", self.visualizer)
        workflow.add_node("response_generator", self.response_generator)
        
        # 设置入口点
        workflow.set_entry_point("orchestrator")
        
        # 添加条件边
        workflow.add_conditional_edges(
            "orchestrator",
            self._route_from_orchestrator,
            {
                "interpreter": "interpreter",
                "scholar": "scholar", 
                "visualizer": "visualizer",
                "response_generator": "response_generator",
                "end": END
            }
        )
        
        # 解读师后的路由
        workflow.add_conditional_edges(
            "interpreter",
            self._route_from_interpreter,
            {
                "visualizer": "visualizer",
                "response_generator": "response_generator"
            }
        )
        
        # 学者后的路由
        workflow.add_edge("scholar", "response_generator")
        
        # 艺术家后的路由
        workflow.add_edge("visualizer", "response_generator")
        
        # 响应生成器后的路由
        workflow.add_conditional_edges(
            "response_generator",
            self._route_from_response_generator,
            {
                "orchestrator": "orchestrator",  # 继续对话循环
                "end": END
            }
        )
        
        return workflow
    
    def _route_from_orchestrator(self, state: DreamAssistantState) -> str:
        """从 Orchestrator 节点路由"""
        return state.get("next_node", "end")
    
    # _route_from_memory已删除，记忆检索由LangGraph Store自动处理
    
    def _route_from_interpreter(self, state: DreamAssistantState) -> str:
        """从解读师节点路由"""
        return state.get("next_node", "response_generator")
    
    def _route_from_response_generator(self, state: DreamAssistantState) -> str:
        """从响应生成器路由 - 强制结束，避免循环"""
        # 每次处理完成后都结束，新消息会创建新的处理流程
        return "end"
    
    
    async def astream_message(self, 
                            user_input: str,
                            chat_id: str,
                            user_id: str,
                            message_id: str,
                            user_images: List[str] = None,
                            user_preferences: Dict[str, Any] = None,
                            existing_messages: List[BaseMessage] = None):
        """处理用户消息并返回流式响应，基于PostgreSQL的原生记忆功能"""
        try:
            # 确保PostgreSQL存储组件已初始化
            await self._initialize_postgres_components()
            
            # 构建用户配置上下文
            config_context = self._build_config_context(user_preferences or {})
            
            # 初始化状态 - 关键：清理可能导致状态污染的字段
            initial_state = {
                "chat_id": chat_id,
                "user_id": user_id,
                "message_id": message_id,
                "user_input": user_input,
                "user_images": user_images or [],
                "messages": (existing_messages or []) + [HumanMessage(content=user_input)],
                "user_preferences": user_preferences or {},
                "iteration_count": 0,
                "max_iterations": 5,
                "should_continue": False,
                "response_metadata": {},
                # 清理可能缓存的处理结果，确保每次都重新处理
                "user_intent": None,
                "dream_interpretation": None,
                "knowledge_answer": None,
                "generated_image": None,
                "final_response": None,
                "error": None,
                "next_node": None,
                "workspace": {
                    "user_config_context": config_context,
                    "session_id": f"{user_id}_{chat_id}",
                    # 添加时间戳确保状态唯一性
                    "processing_timestamp": str(uuid.uuid4()),
                    "fresh_start": True  # 标记这是一个新的处理开始
                }
            }
            
            logger.info(f"🚀 开始流式处理: chat_id={chat_id}, user_id={user_id}, 历史消息数: {len(existing_messages or [])}")
            
            # LangGraph配置对象 - 保持thread_id一致性以维护记忆
            config = {
                "configurable": {
                    "thread_id": chat_id,  # 保持同一对话的thread_id一致
                    "user_id": user_id,    # 用户ID用于store命名空间
                    "checkpoint_ns": f"chat_{chat_id}"
                },
                # 强制从干净状态开始，避免状态污染
                "recursion_limit": 10,  # 限制递归深度
                "stream_mode": ["values", "custom"]
            }
            
            # 在处理前清理可能的旧状态（保持记忆但清理处理状态）
            await self._clean_processing_state(chat_id, config)
            
            # 使用多种流模式：values 用于图状态，custom 用于流式数据
            async for stream_mode, event in self.app.astream(
                initial_state, 
                config=config, 
                stream_mode=["values", "custom"]
            ):
                # 标记事件来源
                event["stream_mode"] = stream_mode
                yield event
                
                # 只对 values 事件保存重要信息
                if stream_mode == "values":
                    await self._auto_save_important_data(event, user_id, chat_id)
                
        except Exception as e:
            logger.error(f"❌ 流式处理错误: {e}", exc_info=True)
            yield {
                "error": str(e),
                "final_response": "抱歉，处理您的消息时遇到了问题。请稍后重试。"
            }
    
    async def _auto_save_important_data(self, event: Dict[str, Any], user_id: str, chat_id: str):
        """自动保存重要数据到PostgreSQL Store（LangGraph官方最佳实践）"""
        try:
            if not self.store or not self._initialized or not event:
                return
            
            # 保存梦境解读结果
            if event.get('dream_interpretation'):
                await self._save_dream_interpretation(event['dream_interpretation'], user_id, chat_id)
            
            # 保存用户偏好变化
            if event.get('user_preferences'):
                await self._save_user_preferences(event['user_preferences'], user_id)
                
        except Exception as e:
            logger.error(f"自动保存重要数据失败: {e}")
    
    async def _save_dream_interpretation(self, interpretation, user_id: str, chat_id: str):
        """保存梦境解读到PostgreSQL Store"""
        try:
            if not self.store or not self._initialized:
                logger.warning("存储未初始化，跳过保存梦境解读")
                return
                
            namespace = ("memories", user_id)
            key = f"dream_interpretation_{uuid.uuid4().hex[:8]}"
            
            data = {
                "type": "dream_pattern",
                "content": getattr(interpretation, 'summary', str(interpretation))[:300],
                "context": f"来自对话: {chat_id}",
                "timestamp": str(uuid.uuid1().time),
                "auto_generated": True
            }
            
            await self.store.aput(namespace, key, data)
            logger.info(f"💾 梦境解读已保存: {key}")
            
        except Exception as e:
            logger.error(f"保存梦境解读失败: {e}")
    
    async def _save_user_preferences(self, preferences: Dict[str, Any], user_id: str):
        """保存用户偏好到PostgreSQL Store"""
        try:
            if not self.store or not self._initialized:
                logger.warning("存储未初始化，跳过保存用户偏好")
                return
                
            namespace = ("preferences", user_id)
            key = "current_preferences"
            
            await self.store.aput(namespace, key, preferences)
            logger.info(f"💾 用户偏好已更新: user_id={user_id}")
            
        except Exception as e:
            logger.error(f"保存用户偏好失败: {e}")
    
    async def get_user_memory_context(self, user_id: str, query: str = "") -> Dict[str, Any]:
        """获取用户记忆上下文（供外部调用）"""
        try:
            if not self.store or not self._initialized:
                return {"memories": [], "preferences": {}, "summary": "存储未初始化"}
            
            # 检索用户记忆
            memories_namespace = ("memories", user_id)
            memories = await self.store.asearch(memories_namespace, query=query, limit=5)
            
            # 获取用户偏好
            prefs_namespace = ("preferences", user_id)
            prefs_result = await self.store.aget(prefs_namespace, "current_preferences")
            preferences = prefs_result.value if prefs_result else {}
            
            return {
                "memories": [m.value for m in memories if hasattr(m, 'value')],
                "preferences": preferences,
                "summary": f"找到 {len(memories)} 条相关记忆"
            }
            
        except Exception as e:
            logger.error(f"获取用户记忆上下文失败: {e}")
            return {"memories": [], "preferences": {}, "summary": "获取失败"}
    
    def _build_config_context(self, user_preferences: Dict[str, Any]) -> str:
        """构建用户配置上下文字符串（用于内部处理，不发送给用户）"""
        if not user_preferences:
            return "使用默认配置"
        
        context_parts = []
        
        # 助手配置
        if user_preferences.get("assistant_name"):
            context_parts.append(f"助手名称：{user_preferences['assistant_name']}")
        
        # 解读风格
        style_map = {
            "professional": "专业学术",
            "friendly": "亲切友好", 
            "poetic": "诗意浪漫",
            "balanced": "平衡综合"
        }
        style = user_preferences.get("interpretation_style", "balanced")
        context_parts.append(f"解读风格：{style_map.get(style, '平衡综合')}")
        
        # 回复长度
        length_map = {
            "concise": "简洁",
            "moderate": "适中", 
            "detailed": "详细"
        }
        length = user_preferences.get("response_length", "moderate")
        context_parts.append(f"回复长度：{length_map.get(length, '适中')}")
        
        # 功能开关
        auto_image = "启用" if user_preferences.get("enable_auto_image_generation", False) else "禁用"
        follow_up = "启用" if user_preferences.get("enable_follow_up_questions", True) else "禁用"
        context_parts.append(f"自动生成图像：{auto_image}")
        context_parts.append(f"追问功能：{follow_up}")
        
        return "用户配置：" + "，".join(context_parts) + "。请根据用户偏好提供个性化的梦境解读服务。"
    
    async def _clean_processing_state(self, chat_id: str, config: dict):
        """清理处理状态但保持记忆 - 根据 LangGraph 官方最佳实践"""
        try:
            if not self.checkpointer or not self._initialized:
                return
            
            # 获取当前 checkpoint
            thread_id = config["configurable"]["thread_id"]
            current_checkpoint = await self.checkpointer.aget(config)
            
            if current_checkpoint:
                # 只清理处理相关的状态，保留记忆和用户偏好
                clean_state = {
                    # 保留的状态
                    "messages": current_checkpoint.channel_values.get("messages", []),
                    "user_preferences": current_checkpoint.channel_values.get("user_preferences", {}),
                    "workspace": current_checkpoint.channel_values.get("workspace", {}),
                    
                    # 清理的处理状态
                    "user_intent": None,
                    "dream_interpretation": None,
                    "knowledge_answer": None,
                    "generated_image": None,
                    "final_response": None,
                    "error": None,
                    "next_node": None,
                    "should_continue": False,
                    "iteration_count": 0
                }
                
                # 更新 checkpoint 为清理后的状态
                await self.checkpointer.aput(config, current_checkpoint.checkpoint, clean_state, {})
                logger.info(f"✅ 已清理处理状态，保留记忆: {thread_id}")
                
        except Exception as e:
            logger.warning(f"⚠️ 清理处理状态失败，继续处理: {e}")
