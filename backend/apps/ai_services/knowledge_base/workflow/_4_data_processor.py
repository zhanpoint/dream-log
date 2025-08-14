"""
数据清洗和预处理管道
对抓取的内容进行高质量的清洗和预处理，具备智能内容分析和批量优化处理能力
"""
import logging
import re
from typing import List, Optional
from dataclasses import dataclass

from langchain_core.documents import Document

logger = logging.getLogger(__name__)


@dataclass
class ProcessingConfig:
    """数据处理配置"""
    # 长度限制
    min_content_length: int = 250
    max_content_length: int = 50000
    min_word_count: int = 50
    max_word_count: int = 10000
    
    # 清洗选项 - 移除HTML相关
    normalize_whitespace: bool = True
    remove_special_chars: bool = False
    preserve_formatting: bool = True
    remove_urls: bool = False
    remove_emails: bool = False
    
    # 质量控制
    enable_duplicate_detection: bool = True


class ContentCleaner:
    """内容清洗器"""
    
    def __init__(self, config: ProcessingConfig = None):
        """初始化内容清洗器"""
        self.config = config or ProcessingConfig()
        
        # 编译正则表达式以提高性能
        self._compile_patterns()
        
    def _compile_patterns(self):
        """编译常用正则表达式模式"""
        # 文本清理模式
        self.whitespace_pattern = re.compile(r'\s+')
        self.multiple_newlines_pattern = re.compile(r'\n\s*\n')
        self.special_chars_pattern = re.compile(r'[^\w\s\-.,!?;:()\[\]{}"\'\n]')
        
        # URL和邮箱模式
        self.url_pattern = re.compile(
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        )
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        
        # 噪音内容模式 - 扩展版本
        self.noise_patterns = [
            # 法律和政策相关
            re.compile(r'cookie\s+policy', re.IGNORECASE),
            re.compile(r'privacy\s+policy', re.IGNORECASE),
            re.compile(r'terms\s+of\s+(service|use)', re.IGNORECASE),
            re.compile(r'disclaimer', re.IGNORECASE),
            
            # 营销和广告
            re.compile(r'subscribe\s+to\s+(our\s+)?newsletter', re.IGNORECASE),
            re.compile(r'advertisement', re.IGNORECASE),
            re.compile(r'sponsored\s+content', re.IGNORECASE),
            re.compile(r'click\s+here', re.IGNORECASE),
            re.compile(r'read\s+more', re.IGNORECASE),
            re.compile(r'learn\s+more', re.IGNORECASE),
            
            # 社交媒体
            re.compile(r'share\s+this', re.IGNORECASE),
            re.compile(r'follow\s+us', re.IGNORECASE),
            re.compile(r'like\s+us\s+on', re.IGNORECASE),
            re.compile(r'tweet\s+this', re.IGNORECASE),
            
            # 导航和界面元素
            re.compile(r'skip\s+to\s+(main\s+)?content', re.IGNORECASE),
            re.compile(r'go\s+to\s+top', re.IGNORECASE),
            re.compile(r'back\s+to\s+top', re.IGNORECASE),
            re.compile(r'menu', re.IGNORECASE),
            re.compile(r'breadcrumb', re.IGNORECASE),
            
            # 错误和技术信息
            re.compile(r'javascript\s+(required|disabled)', re.IGNORECASE),
            re.compile(r'enable\s+cookies', re.IGNORECASE),
            re.compile(r'browser\s+not\s+supported', re.IGNORECASE),
            re.compile(r'loading\.\.\.', re.IGNORECASE),
            
            # 版权和作者信息（在某些情况下可能是噪音）
            re.compile(r'©\s*\d{4}', re.IGNORECASE),
            re.compile(r'all\s+rights\s+reserved', re.IGNORECASE)
        ]
        
    def _smart_whitespace_normalization(self, text: str) -> str:
        """智能空白字符标准化"""
        # 1. 标准化不同类型的空白字符
        text = re.sub(r'[\t\r\f\v]+', ' ', text)  # 制表符等转为空格
        
        # 2. 处理多余的空格，但保留段落结构
        text = self.whitespace_pattern.sub(' ', text)
        
        # 3. 标准化换行符，保持段落分隔
        text = self.multiple_newlines_pattern.sub('\n\n', text)
        
        # 4. 清理行首行尾空白，但保持结构
        lines = []
        for line in text.split('\n'):
            cleaned_line = line.strip()
            if cleaned_line or (lines and lines[-1]):  # 保留有意义的空行
                lines.append(cleaned_line)
        
        text = '\n'.join(lines)
        
        return text.strip()
    
    def _remove_noise_content_smart(self, text: str) -> str:
        """智能移除噪音内容"""
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # 检查是否为噪音行
            is_noise = any(pattern.search(line) for pattern in self.noise_patterns)
            
            # 短行检查（如果一行非常短，且包含噪音词，则更可能是噪音）
            if len(line.strip()) < 50 and is_noise:
                continue
                
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def _remove_urls_and_emails(self, text: str) -> str:
        """移除URL和邮箱"""
        if self.config.remove_urls:
            text = self.url_pattern.sub('', text)
        if self.config.remove_emails:
            text = self.email_pattern.sub('', text)
        return text

    def _preserve_structure_intelligent(self, text: str) -> str:
        """智能保留结构"""
        # 移除多余的空行，但保留Markdown结构
        lines = text.split('\n')
        processed_lines = []
        in_code_block = False
        
        for line in lines:
            if line.strip().startswith("```"):
                in_code_block = not in_code_block
                processed_lines.append(line)
                continue
            
            if not in_code_block and not line.strip():
                # 如果前一行也是空行，则跳过
                if processed_lines and not processed_lines[-1].strip():
                    continue
            
            processed_lines.append(line)
            
        return '\n'.join(processed_lines)

    def clean_content(self, text: str) -> str:
        """
        对内容进行全面清洗
        
        Args:
            text: 待清洗的文本内容
            
        Returns:
            清洗后的文本内容
        """
        if not text:
            return ""

        cleaned_text = text
        
        # 智能空白标准化
        if self.config.normalize_whitespace:
            cleaned_text = self._smart_whitespace_normalization(cleaned_text)
            
        # 移除智能噪音内容
        cleaned_text = self._remove_noise_content_smart(cleaned_text)
        
        # 移除URL和邮箱
        cleaned_text = self._remove_urls_and_emails(cleaned_text)

        # 移除特殊字符
        if self.config.remove_special_chars:
            cleaned_text = self.special_chars_pattern.sub('', cleaned_text)
        
        # 智能保留结构
        if self.config.preserve_formatting:
            cleaned_text = self._preserve_structure_intelligent(cleaned_text)
            
        return cleaned_text.strip()


class DocumentProcessor:
    """文档处理器"""
    
    def __init__(self, config: ProcessingConfig = None):
        """初始化文档处理器"""
        self.config = config or ProcessingConfig()
        self.cleaner = ContentCleaner(self.config)
        self.processed_hashes = set()

    def process_document(self, doc: Document) -> Optional[Document]:
        """
        处理单个文档
        
        Args:
            doc: 待处理的文档
            
        Returns:
            处理后的文档，如果文档无效则返回None
        """
        if not isinstance(doc.page_content, str) or not doc.page_content.strip():
            return None
            
        # 1. 清洗内容
        cleaned_content = self.cleaner.clean_content(doc.page_content)
        
        # 2. 验证内容长度和词数
        if not (self.config.min_content_length <= len(cleaned_content) <= self.config.max_content_length):
            return None
            
        word_count = len(cleaned_content.split())
        if not (self.config.min_word_count <= word_count <= self.config.max_word_count):
            return None
        
        # 3. 更新文档内容
        doc.page_content = cleaned_content
        
        # 4. 去重检查（仅在当前处理批次内有效，不污染最终元数据）
        if self.config.enable_duplicate_detection:
            content_hash = hash(cleaned_content)
            if content_hash in self.processed_hashes:
                return None  # 如果是重复内容则过滤
            self.processed_hashes.add(content_hash)
            # V3.8: 不再将此临时哈希添加到文档元数据中
            # doc.metadata["content_hash"] = str(content_hash)
            
        return doc
        
    def process_documents_batch(self, documents: List[Document]) -> List[Document]:
        """
        批量处理文档
        
        Args:
            documents: 待处理的文档列表
            
        Returns:
            处理后的文档列表
        """
        processed_docs = []
        for doc in documents:
            processed_doc = self.process_document(doc)
            if processed_doc:
                processed_docs.append(processed_doc)
        return processed_docs

def create_document_processor(min_length: int = 100, 
                            max_length: int = 50000) -> DocumentProcessor:
    """
    创建文档处理器实例
    
    Args:
        min_length: 最小内容长度
        max_length: 最大内容长度
        
    Returns:
        DocumentProcessor实例
    """
    config = ProcessingConfig(
        min_content_length=min_length,
        max_content_length=max_length
    )
    return DocumentProcessor(config=config)
