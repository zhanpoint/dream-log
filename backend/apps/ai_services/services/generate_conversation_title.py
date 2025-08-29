"""
对话标题生成服务
基于对话内容生成合适的标题，提供完整的业务逻辑封装
"""
import logging
from typing import Dict, Any

from ..chains.generate_conversation_title import get_conversation_title_generation_chain

logger = logging.getLogger(__name__)


class ConversationTitleGenerationService:
    """对话标题生成服务类"""
    
    def __init__(self):
        """初始化对话标题生成服务"""
        self.conversation_title_chain = get_conversation_title_generation_chain()
    
    def clean_generated_title(self, title: str) -> str:
        """
        清理生成的标题，移除多余的符号和格式标记
        
        Args:
            title: 原始生成的标题
            
        Returns:
            清理后的标题
        """
        if not title:
            return ""
        
        # 移除常见的前缀、后缀和格式标记
        cleaned = title.strip()
        
        # 移除引号
        cleaned = cleaned.strip('"').strip("'").strip('`')
        
        # 移除可能的标签或标记
        prefixes_to_remove = [
            '标题：', 'Title:', 'title:', '对话标题：', 
            '生成的标题：', '**', '*', '#'
        ]
        
        for prefix in prefixes_to_remove:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()
        
        return cleaned
    
    def generate_conversation_title(self, conversation_content: str) -> Dict[str, Any]:
        """
        为对话内容生成标题
        
        Args:
            conversation_content: 对话内容（用户问题和助手回复）
            
        Returns:
            生成结果字典
        """
        try:
            # 检查链是否可用
            if not self.conversation_title_chain:
                return {
                    'success': False,
                    'error': '对话标题生成链未初始化'
                }
            
            # 生成标题
            raw_title = self.conversation_title_chain.invoke({"conversation_content": conversation_content})
            
            if not raw_title:
                return {
                    'success': False,
                    'error': '标题生成失败，返回空结果'
                }
            
            # 清理标题
            cleaned_title = self.clean_generated_title(raw_title)
            
            if not cleaned_title:
                return {
                    'success': False,
                    'error': '标题清理后为空，生成失败'
                }
            
            result = {
                'success': True,
                'title': cleaned_title,
                'raw_title': raw_title  # 保留原始生成结果用于调试
            }
            
            logger.info(f"Successfully generated conversation title: '{cleaned_title}'")
            return result
            
        except Exception as e:
            logger.error(f"Error generating conversation title: {e}", exc_info=True)
            return {
                'success': False,
                'error': f'对话标题生成过程中出现错误: {str(e)}'
            }


# 全局服务实例
_conversation_title_service = None


def get_conversation_title_service() -> ConversationTitleGenerationService:
    """获取对话标题生成服务实例"""
    global _conversation_title_service
    if _conversation_title_service is None:
        _conversation_title_service = ConversationTitleGenerationService()
    return _conversation_title_service
