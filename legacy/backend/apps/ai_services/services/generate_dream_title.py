"""
梦境标题生成服务
基于梦境内容生成合适的标题，提供完整的业务逻辑封装
"""
import logging
from typing import Dict, Any

from ..chains.generate_dream_title import get_title_generation_chain

logger = logging.getLogger(__name__)


class DreamTitleGenerationService:
    """梦境标题生成服务类"""
    
    def __init__(self):
        """初始化标题生成服务"""
        self.title_chain = get_title_generation_chain()
    
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
            '标题：', 'Title:', 'title:', '梦境标题：', 
            '生成的标题：', '**', '*', '#'
        ]
        
        for prefix in prefixes_to_remove:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()
        
        return cleaned
    
    def generate_title(self, dream_content: str) -> Dict[str, Any]:
        """
        为梦境内容生成标题
        
        Args:
            dream_content: 梦境内容（前端已验证）
            
        Returns:
            生成结果字典
        """
        try:
            # 生成标题
            raw_title = self.title_chain.invoke({"dream_content": dream_content})
            
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
            
            logger.info(f"Successfully generated title: '{cleaned_title}'")
            return result
            
        except Exception as e:
            logger.error(f"Error generating dream title: {e}", exc_info=True)
            return {
                'success': False,
                'error': f'标题生成过程中出现错误: {str(e)}'
            }


# 全局服务实例
_dream_title_service = None


def get_dream_title_service() -> DreamTitleGenerationService:
    """获取梦境标题生成服务实例"""
    global _dream_title_service
    if _dream_title_service is None:
        _dream_title_service = DreamTitleGenerationService()
    return _dream_title_service