"""
智能文本分块策略 - 优化版本
针对梦境解析内容的专业分块处理，具备语义感知和自适应分割能力
"""
import logging
import re
from dataclasses import dataclass
from typing import List, Dict, Callable

from langchain_core.documents import Document
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    MarkdownHeaderTextSplitter,
)

from ..quality_assessment import UnifiedQualityEvaluator

logger = logging.getLogger(__name__)


@dataclass
class ChunkingConfig:
    """分块配置"""
    # 基础分块参数
    chunk_size: int = 768
    chunk_overlap: int = 150
    min_chunk_size: int = 150
    max_chunk_size: int = 768 * 2
    
    # 分块策略
    preserve_sentence_boundaries: bool = True
    preserve_paragraph_structure: bool = True
    
    # 质量控制
    min_chunk_quality_score: float = 0.25  # 降低阈值，避免过度过滤
    enable_chunk_validation: bool = True
    remove_low_quality_chunks: bool = True
    
    # 元数据配置
    add_chunk_metadata: bool = True
    track_chunk_relationships: bool = True
    
    # 性能配置
    length_function: Callable[[str], int] = len
    keep_separator: bool = True
    add_start_index: bool = True
    strip_whitespace: bool = True


class DreamContentSplitter:
    """梦境内容智能分块器"""
    
    def __init__(self, config: ChunkingConfig = None):
        """初始化分块器"""
        self.config = config or ChunkingConfig()
        
        # 梦境相关的语义分隔符(按优先级排序) - 优化Markdown和纯文本
        self.dream_separators = [
            # Markdown结构
            "\n# ",           # H1
            "\n## ",          # H2  
            "\n### ",         # H3
            "\n#### ",        # H4
            
            # 段落和列表
            "\n\n",           # 段落
            "\n- ",           # 无序列表
            "\n* ",           # 无序列表
            "\n1. ",          # 有序列表
            
            # 专业分隔符（针对学术内容）
            "\nAbstract",     # 摘要
            "\nIntroduction", # 介绍
            "\nMethodology",  # 方法论
            "\nResults",      # 结果
            "\nConclusion",   # 结论
            "\nReferences",   # 参考文献
            
            # 句子和词汇边界
            ". ",             # 句号
            "\n",             # 换行
            " ",              # 空格
            "",               # 字符
        ]
        
        # 初始化分块器
        self._initialize_splitters()
        
        # 分块质量评估器（统一）
        self.quality_evaluator = UnifiedQualityEvaluator()
    
    def _initialize_splitters(self):
        """初始化分块器"""
        # 主要递归分块器 - 使用优化的分隔符
        self.recursive_splitter = RecursiveCharacterTextSplitter(
            separators=self.dream_separators,
            chunk_size=self.config.chunk_size,
            chunk_overlap=self.config.chunk_overlap,
            length_function=self.config.length_function,
            keep_separator=self.config.keep_separator,
            add_start_index=self.config.add_start_index,
            strip_whitespace=self.config.strip_whitespace
        )
        
        # Markdown分块器(用于结构化内容)
        self.markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=[
                ("#", "Header 1"),
                ("##", "Header 2"),
                ("###", "Header 3"),
                ("####", "Header 4"),
            ],
            strip_headers=False
        )
    
    def _detect_content_type(self, text: str) -> str:
        """
        检测内容是否为Markdown
        
        Args:
            text: 文本内容
            
        Returns:
            内容类型: 'markdown' 或 'plain'
        """
        # 基于规则检测Markdown标记
        markdown_patterns = [
            r'^#+\s',           # 标题
            r'^\s*[-*+]\s',     # 无序列表
            r'^\s*\d+\.\s',     # 有序列表
            r'\[.*?\]\(.*?\)',   # 链接
            r'\*\*.*?\*\*|\_\_.*?\_\_', # 粗体
            r'\*.*?\*|\_.*?\_',   # 斜体
            r'`.*?`',           # 行内代码
            r'^\`\`\`',         # 代码块
        ]
        
        markdown_score = sum(1 for pattern in markdown_patterns 
                           if re.search(pattern, text, re.MULTILINE))
        
        # 如果找到多个Markdown特征，则认为是Markdown
        if markdown_score >= 2:
            return 'markdown'
        return 'plain'
    
    def _enhance_chunk_metadata(self, chunk: Document, 
                              original_doc: Document, 
                              chunk_index: int) -> Document:
        """
        增强分块元数据
        
        Args:
            chunk: 分块文档
            original_doc: 原始文档
            chunk_index: 分块索引
            
        Returns:
            增强后的分块文档
        """
        # 复制原始元数据
        enhanced_metadata = original_doc.metadata.copy()
        
        # 添加分块特定元数据
        enhanced_metadata.update({
            "chunk_index": chunk_index,
            "chunk_size": len(chunk.page_content),
            "is_chunk": True,
            "parent_doc_id": original_doc.metadata.get("document_hash", ""),
        })
        
        # 创建新的文档对象
        enhanced_chunk = Document(
            page_content=chunk.page_content,
            metadata=enhanced_metadata
        )
        
        return enhanced_chunk
    


    def split_document(self, document: Document) -> List[Document]:
        """
        分割单个文档
        
        Args:
            document: 要分割的文档
            
        Returns:
            分块后的文档列表
        """
        content = document.page_content
        if not content or len(content.strip()) < self.config.min_chunk_size:
            logger.debug(f"Document content from '{document.metadata.get('source_url', 'N/A')}' too short for splitting.")
            return []
        
        try:
            # 检测内容类型并选择合适的分块策略
            content_type = self._detect_content_type(content)
            logger.debug(f"Detected content type: {content_type} for document '{document.metadata.get('source_url', 'N/A')}'")
            
            if content_type == 'markdown':
                # Markdown内容优先使用标题分割，再对子块递归分割
                try:
                    header_chunks = self.markdown_splitter.split_text(content)
                    
                    # 检查是否真的按标题分割了
                    is_meaningful_split = len(header_chunks) > 1 or (
                        len(header_chunks) == 1 and header_chunks[0].metadata
                    )

                    if is_meaningful_split:
                        all_sub_chunks = []
                        for header_chunk in header_chunks:
                            # 对每个按标题分割的大块进行再次递归分割
                            sub_texts = self.recursive_splitter.split_text(header_chunk.page_content)
                            # 继承父块（标题块）的元数据
                            new_metadata = header_chunk.metadata.copy()
                            sub_docs = [Document(page_content=text, metadata=new_metadata) for text in sub_texts]
                            all_sub_chunks.extend(sub_docs)
                        chunks = all_sub_chunks
                    else:
                        # 如果标题分割没有产生效果，直接对全文进行递归分割
                        chunk_texts = self.recursive_splitter.split_text(content)
                        chunks = [Document(page_content=text, metadata=document.metadata) for text in chunk_texts]
                except Exception as e:
                    logger.warning(f"Markdown splitting failed, falling back to recursive splitter: {e}")
                    chunk_texts = self.recursive_splitter.split_text(content)
                    chunks = [Document(page_content=text, metadata=document.metadata) for text in chunk_texts]
            else:
                # 纯文本直接使用递归分割
                chunk_texts = self.recursive_splitter.split_text(content)
                chunks = [Document(page_content=text, metadata=document.metadata) for text in chunk_texts]
            
            # 增强每个分块的元数据
            enhanced_chunks = [
                self._enhance_chunk_metadata(chunk, document, i)
                for i, chunk in enumerate(chunks)
            ]
            
            # 基于统一质量评估器过滤低质量分块
            final_chunks = []
            for ch in enhanced_chunks:
                # 评估分块质量但不存储额外字段，避免超过元数据限制
                quality_score = self.quality_evaluator.evaluate_chunk_quality(ch.page_content, ch.metadata)
                if quality_score >= self.config.min_chunk_quality_score:
                    final_chunks.append(ch)
            
            num_original = len(chunks)
            num_final = len(final_chunks)
            logger.info(f"Document split into {num_original} chunks, "
                        f"{num_final} chunks remain after quality filtering.")
            
            return final_chunks
            
        except Exception as e:
            logger.error(f"Error splitting document from '{document.metadata.get('source_url', 'N/A')}': {e}", exc_info=True)
            return []
    
    def split_documents_batch(self, documents: List[Document]) -> List[Document]:
        """
        批量分割文档
        
        Args:
            documents: 要分割的文档列表
            
        Returns:
            所有分块的列表
        """
        logger.info(f"Splitting {len(documents)} documents into chunks")
        
        all_chunks = []
        total_chunks = 0
        
        for i, doc in enumerate(documents):
            source_url = doc.metadata.get("source_url", f"doc_{i+1}")
            logger.debug(f"Splitting document {i+1}/{len(documents)} ('{source_url}')")
            
            try:
                chunks = self.split_document(doc)
                all_chunks.extend(chunks)
                total_chunks += len(chunks)
                
                logger.debug(f"Document '{source_url}' produced {len(chunks)} chunks")
                
            except Exception as e:
                logger.error(f"Error splitting document '{source_url}': {e}")
                continue
        
        avg_chunks_per_doc = total_chunks / len(documents) if documents else 0
        
        logger.info(f"Batch splitting completed: {total_chunks} total chunks, "
                   f"avg {avg_chunks_per_doc:.1f} chunks per document")
        
        return all_chunks


# 工厂函数
def create_dream_splitter(chunk_size: int = 768, 
                         chunk_overlap: int = 150,
                         **kwargs) -> DreamContentSplitter:
    """
    创建梦境内容分块器
    
    Args:
        chunk_size: 分块大小
        chunk_overlap: 分块重叠
        **kwargs: 其他配置参数
        
    Returns:
        配置好的分块器
    """
    config = ChunkingConfig(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        **kwargs
    )
    return DreamContentSplitter(config)

def create_adaptive_splitter(**kwargs) -> DreamContentSplitter:
    """
    创建高质量分块器（原自适应分块器）
    
    Args:
        **kwargs: 配置参数
        
    Returns:
        高质量分块器
    """
    config = ChunkingConfig(
        preserve_sentence_boundaries=True,
        preserve_paragraph_structure=True,
        enable_chunk_validation=True,
        remove_low_quality_chunks=True,
        **kwargs
    )
    return DreamContentSplitter(config)

def create_quality_focused_splitter(**kwargs) -> DreamContentSplitter:
    """
    创建质量优先分块器
    
    Args:
        **kwargs: 配置参数
        
    Returns:
        质量优先分块器
    """
    config = ChunkingConfig(
        min_chunk_quality_score=0.35,  # 降低阈值，保持质量导向但不过度严格
        enable_chunk_validation=True, 
        remove_low_quality_chunks=True,
        add_chunk_metadata=True,
        **kwargs
    )
    return DreamContentSplitter(config)
