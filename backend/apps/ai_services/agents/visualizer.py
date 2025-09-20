"""
灵感艺术家 Visualizer - 负责生成梦境图像
使用 Gemini 2.0 Flash Preview Image Generation 模型
"""
import logging
import base64
from typing import Dict, Any, Optional
from google.ai import generativelanguage as genai
from langchain_core.messages import HumanMessage

from ..graph.dream_assistant_state import OverallState, ImageGenerationRequest
from ..config import get_image_prompt_llm
from config.env_loader import env
from ..prompts.dream_assistant_prompts import prompt_manager

logger = logging.getLogger(__name__)


class DreamVisualizer:
    """梦境图像生成器 - 使用 Gemini 2.0 Flash Preview Image Generation"""
    
    def __init__(self):
        self.llm = get_image_prompt_llm()
        # 初始化 Gemini 客户端
        google_api_key = env('GOOGLE_API_KEY', default='')
        if not google_api_key:
            raise ValueError("GOOGLE_API_KEY is required for image generation")
        self.client = genai.Client(api_key=google_api_key)
    
    def __call__(self, state: OverallState) -> Dict[str, Any]:
        """生成梦境图像""" 
        try:
            # 检查是否已有图像生成请求
            if not state.get("image_generation_request"):
                # 创建图像生成请求
                request = self._prepare_image_request(state)
                if not request:
                    state["error"] = "无法准备图像生成请求"
                    state["next_node"] = "response_generator"
                    return state
                state["image_generation_request"] = request
            else:
                request = state["image_generation_request"]
            
            # 优化提示词
            optimized_prompt = self._optimize_prompt(request)
            
            # 调用 Gemini API 生成图像
            image_url = self._generate_image(optimized_prompt)
            
            if image_url:
                state["generated_image_url"] = image_url
                state["response_metadata"]["image_generation"] = {
                    "prompt": optimized_prompt,
                    "style": request.style,
                    "success": True
                }
                # 同步写入到工作空间，方便后续序列化保存
                state["workspace"]["generated_image_url"] = image_url
                logger.info(f"梦境图像生成成功: {image_url}")
            else:
                state["error"] = "图像生成失败"
                state["response_metadata"]["image_generation"] = {
                    "prompt": optimized_prompt,
                    "success": False
                }
            
            # 设置下一个节点
            state["next_node"] = "response_generator"
            
            return state
            
        except Exception as e:
            logger.error(f"图像生成失败: {e}")
            state["error"] = f"图像生成过程中出现错误: {str(e)}"
            state["next_node"] = "response_generator"
            return state
    
    def _prepare_image_request(self, state: OverallState) -> Optional[ImageGenerationRequest]:
        """准备图像生成请求"""
        # 从梦境解读中提取信息
        if state.get("dream_interpretation"):
            interpretation = state["dream_interpretation"]
            
            # 构建描述
            description_parts = []
            if interpretation.summary:
                description_parts.append(interpretation.summary)
            
            # 添加关键元素
            keywords = interpretation.key_elements[:5] if interpretation.key_elements else []
            
            # 从用户输入中提取额外信息
            user_input = state.get("user_input", "")
            if "生成" in user_input or "画" in user_input:
                # 用户明确要求生成图像，可能包含风格要求
                style = self._extract_style_preference(user_input)
            else:
                style = "梦幻超现实主义"
            
            return ImageGenerationRequest(
                description=" ".join(description_parts),
                style=style,
                keywords=keywords
            )
        
        # 直接从用户输入创建请求
        elif state.get("user_input"):
            return ImageGenerationRequest(
                description=state["user_input"],
                style="梦幻超现实主义",
                keywords=[]
            )
        
        return None
    
    def _extract_style_preference(self, text: str) -> str:
        """从文本中提取风格偏好"""
        style_keywords = {
            "超现实": "超现实主义梦境艺术",
            "写实": "写实主义梦境场景",
            "抽象": "抽象表现主义",
            "水彩": "梦幻水彩画风格",
            "油画": "古典油画风格",
            "科幻": "科幻赛博朋克风格",
            "奇幻": "奇幻魔法风格",
            "恐怖": "哥特式暗黑风格",
            "温馨": "温暖治愈系风格",
            "极简": "极简主义风格"
        }
        
        for keyword, style in style_keywords.items():
            if keyword in text:
                return style
        
        return "梦幻超现实主义"
    
    def _optimize_prompt(self, request: ImageGenerationRequest) -> str:
        """优化图像生成提示词"""
        try:
            # 使用统一的提示词管理器
            prompt_text = prompt_manager.format_prompt(
                "image_prompt",
                dream_description=request.description,
                style_preference=request.style
            )
            
            result = self.llm.invoke([HumanMessage(content=prompt_text)])
            
            optimized_prompt = result.content.strip()
            
            # 添加通用质量标签
            quality_tags = [
                "high quality",
                "detailed",
                "artistic",
                "dreamlike atmosphere",
                "professional photography"
            ]
            
            final_prompt = f"{optimized_prompt}, {', '.join(quality_tags)}"
            
            return final_prompt[:500]  # 限制长度
            
        except Exception as e:
            logger.error(f"提示词优化失败: {e}")
            # 返回基础提示词
            return f"{request.description}, {request.style}, dreamlike, artistic"
    
    def _generate_image(self, prompt: str) -> Optional[str]:
        """调用 Gemini 2.0 Flash Preview Image Generation 生成图像

        - 按照官方 SDK 要求，为图像模型显式设置 response_modalities 为 ["IMAGE", "TEXT"]
        - 同时指定 response_mime_type 为 image/png，确保返回 inline_data 为 PNG 数据
        - 兼容不同返回结构，稳健提取 base64 数据
        """
        try:
            # 首选配置：IMAGE + TEXT 组合，并指定 PNG MIME 类型
            response = self.client.models.generate_content(
                model="gemini-2.0-flash-preview-image-generation",
                contents=[prompt],
                config={
                    # 按模型要求，返回包含 IMAGE 与 TEXT 的组合
                    "response_modalities": ["IMAGE", "TEXT"],
                },
            )

            # 提取生成的图像（优先从第一候选项中读取）
            candidates = getattr(response, "candidates", []) or []
            for candidate in candidates:
                content = getattr(candidate, "content", None)
                parts = getattr(content, "parts", []) if content else []
                for part in parts:
                    inline = getattr(part, "inline_data", None)
                    if inline:
                        data = getattr(inline, "data", b"")
                        # data 可能已是 bytes，也可能是 base64 字符串，均进行标准化
                        if isinstance(data, str):
                            # 假如 SDK 返回的是 base64 字符串，直接拼接
                            return f"data:image/png;base64,{data}"
                        try:
                            return f"data:image/png;base64,{base64.b64encode(data).decode('utf-8')}"
                        except Exception:
                            # 若不是可编码对象，继续查找后续 part
                            continue

            logger.warning("Gemini 响应中未找到图像数据 (inline_data)")
            return None

        except Exception as e:
            logger.error(f"调用 Gemini 图像生成 API 失败: {e}")
            return None
