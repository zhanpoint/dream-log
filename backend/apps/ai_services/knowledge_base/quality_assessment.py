"""
统一质量评估模块
- 为搜索结果、抓取内容、文档验证与分块质量提供一致的评分与阈值判断
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse


@dataclass
class QualityConfig:
    """统一质量评估配置"""
    # 搜索相关
    preferred_domains: List[str] = field(default_factory=lambda: [
        # 百科与学术
        "wikipedia", "britannica", "stanford.edu", "harvard.edu", "mit.edu", "cam.ac.uk", "ox.ac.uk", "jstor.org",
        # 心理学与神经科学
        "psychologytoday", "apa.org", "simplypsychology.org", "neuroscience", "psychcentral", "verywellmind",
        # 健康与医学
        "sleepfoundation.org", "healthline", "webmd", "medicalnewstoday", "pubmed.ncbi.nlm.nih.gov", "who.int", "mayoclinic.org",
        # 知名科学杂志与期刊
        "scientificamerican", "nature.com", "sciencemag.org", "sciencedirect", "springer"
    ])
    spam_domain_indicators: List[str] = field(default_factory=lambda: [
        # 博客与自动生成内容平台
        "blogspot", "wordpress.com", "tumblr", "wix", "weebly", "medium.com",
        # 命理、占卜、周公解梦类 
        "8s8s", "golla", "click108", "httpcn", "zgjm", "fortunetelling",
        "dreamdictionary", "dreammoods",
        # 低质量论坛与社区
        "bbs", "forum", "tieba",
        # 可疑的顶级域名
        ".top", ".xyz", ".info", ".online", ".club", ".site", ".website", ".biz", ".icu"
    ])
    min_search_quality_threshold: float = 0.30

    # 内容与文档相关
    min_doc_length: int = 250
    max_doc_length: int = 100000
    relevance_threshold: float = 0.10
    min_alpha_ratio: float = 0.50

    # 分块相关
    min_chunk_quality_threshold: float = 0.25


class UnifiedQualityEvaluator:
    """统一质量评估器"""

    # 1. 优化: 将关键词列表移至类级别，避免重复创建
    DREAM_KEYWORDS = [
        "dream", "dreams", "dreaming", "dreamt", "nightmare", "sleep",
        "unconscious", "subconscious", "psychology", "freud", "jung",
        "interpretation", "symbol", "meaning", "analysis", "psychoanalysis",
        "rem", "lucid", "vision", "imagery", "metaphor", "archetype"
    ]

    QUALITY_INDICATORS = [
        "research", "study", "analysis", "theory", "scientific",
        "academic", "journal", "professor", "university", "institute",
        "peer-reviewed", "clinical", "therapeutic"
    ]

    SPAM_INDICATORS = [
        "click here", "buy now", "advertisement", "sponsored",
        "lorem ipsum", "404 error", "page not found", "coming soon",
        "under construction", "login required", "subscribe now"
    ]

    def __init__(self, config: Optional[QualityConfig] = None):
        self.config = config or QualityConfig()

        # 2. 优化: 预编译正则表达式以提升性能
        self.heading_pattern = re.compile(r'^#+\s|<h[1-6]>', re.MULTILINE | re.IGNORECASE)
        self.list_pattern = re.compile(r'^\s*[-*+]\s|^\s*\d+\.\s|<[uo]l>', re.MULTILINE | re.IGNORECASE)

    # ============ 搜索阶段 ============
    def score_domain(self, domain: str) -> float:
        """域名质量评分 0-1 (精细化加权版本)"""
        if not domain:
            return 0.0
        
        d = domain.lower()
        score = 0.5  # 基础分设为0.5，更中性

        # 1. 顶级域名(TLD)评分
        if any(d.endswith(suffix) for suffix in [".edu", ".gov"]):
            score += 0.40  # 高权重加分
        elif any(d.endswith(suffix) for suffix in [".org"]):
            score += 0.20  # 中权重加分
        elif any(d.endswith(suffix) for suffix in [".com", ".net"]):
            score += 0.05  # 轻微加分

        # 2. 优选域名评分
        if any(p in d for p in self.config.preferred_domains):
            score += 0.50  # 大幅加分

        # 3. 垃圾内容指示器惩罚
        if any(s in d for s in self.config.spam_domain_indicators):
            score -= 0.40  # 高权重惩罚

        # 4. 域名结构惩罚
        # 域名过长或包含过多连字符，通常是垃圾邮件或低质量网站的标志
        if len(d) > 30:
            score -= 0.10
        if d.count('-') > 2:
            score -= 0.15

        return max(0.0, min(1.0, score))

    def score_search_result(self, url: str, title: str = "", snippet: str = "", tavily_score: Optional[float] = None) -> float:
        """
        搜索结果整体质量评分 0-1.
        可选地与Tavily score进行加权融合，形成更全面的最终分数。
        """
        try:
            domain = urlparse(url).netloc
        except Exception:
            domain = ""

        text = f"{title} {snippet}".lower()

        # 域名评分
        domain_score = self.score_domain(domain)  # 40%

        # 相关性评分
        relevance_score = 0.0
        for kw in self.DREAM_KEYWORDS:
            if kw in text:
                relevance_score += 0.10
        relevance_score = min(1.0, relevance_score)  # 30%

        # 标题质量
        title_score = 0.0
        if title:
            # V3.7: 优化标题长度判断，过长或过短都可能意味着低质量
            if 10 < len(title) < 150:  # 调整上限至150
                title_score += 0.20
            # V3.7: 增加更多专业关键词以适应学术内容
            if any(w in title.lower() for w in ["dream", "psychology", "interpretation", "meaning", "symbol", "scientific", "study", "research"]):
                title_score += 0.20
        title_score = min(1.0, title_score)  # 20%

        # 片段长度
        content_score = 0.20 if len(snippet) > 100 else 0.0  # 10%

        # 垃圾词惩罚
        penalty = 0.0
        for bad in self.SPAM_INDICATORS:
            if bad in text:
                penalty += 0.30

        custom_quality_score = domain_score * 0.40 + relevance_score * 0.30 + title_score * 0.20 + content_score * 0.10
        custom_quality_score -= penalty
        custom_quality_score = max(0.0, min(1.0, custom_quality_score))
        
        # 如果提供了Tavily score，则进行加权融合
        if tavily_score is not None:
            # 60% 自定义质量分, 40% Tavily相关性分
            final_score = (custom_quality_score * 0.6) + (tavily_score * 0.4)
            return max(0.0, min(1.0, final_score))

        return custom_quality_score

    # ============ 内容/文档阶段 ============
    def _length_score(self, text: str) -> float:
        words = len(text.split())
        if 200 <= words <= 3000:
            return 1.0
        if 100 <= words < 200 or 3000 < words <= 5000:
            return 0.8
        if 50 <= words < 100 or 5000 < words <= 10000:
            return 0.6
        if words < 50:
            return 0.2
        return 0.4

    def _relevance_score(self, text_lower: str, title_lower: str) -> float:
        combined = f"{text_lower} {title_lower}"
        kw_count = sum(combined.count(kw) for kw in self.DREAM_KEYWORDS)
        words = len(text_lower.split())
        if words == 0:
            return 0.0
        density = kw_count / words
        return min(1.0, density / 0.02)  # 2%密度满分

    def _quality_indicator_score(self, text_lower: str, title_lower: str) -> float:
        combined = f"{text_lower} {title_lower}"
        count = sum(1 for q in self.QUALITY_INDICATORS if q in combined)
        return min(1.0, count / 5.0)

    def _structure_score(self, content: str) -> float:
        score = 0.0
        # 使用预编译的正则表达式
        if self.heading_pattern.search(content):
            score += 0.3
        paragraph_count = content.count('\n\n') + content.count('<p>')
        if paragraph_count >= 3:
            score += 0.3
        elif paragraph_count >= 1:
            score += 0.15
        # 使用预编译的正则表达式
        if self.list_pattern.search(content):
            score += 0.2
        sentences = re.findall(r'[.!?]+', content)
        words = len(content.split())
        if words > 0 and len(sentences) > 0:
            avg_len = words / len(sentences)
            if 10 <= avg_len <= 25:
                score += 0.2
            elif 5 <= avg_len < 10 or 25 < avg_len <= 40:
                score += 0.1
        return min(1.0, score)

    def _spam_penalty(self, text_lower: str) -> float:
        penalty = 0.0
        for bad in self.SPAM_INDICATORS:
            if bad in text_lower:
                penalty += 0.2
        return min(0.8, penalty)

    def evaluate_content(self, content: str, title: str = "", url: str = "") -> Dict[str, float]:
        """统一的抓取内容质量评估，返回分项分数与overall_score"""
        if not content:
            return {"overall_score": 0.0, "length_score": 0.0, "relevance_score": 0.0,
                    "quality_score": 0.0, "structure_score": 0.0}

        text_lower = content.lower()
        title_lower = title.lower() if title else ""

        length_score = self._length_score(content)
        relevance_score = self._relevance_score(text_lower, title_lower)
        quality_score = self._quality_indicator_score(text_lower, title_lower)
        structure_score = self._structure_score(content)
        spam_penalty = self._spam_penalty(text_lower)

        overall = length_score * 0.20 + relevance_score * 0.30 + quality_score * 0.25 + structure_score * 0.25
        overall -= spam_penalty
        overall = max(0.0, min(1.0, overall))

        return {
            "overall_score": round(overall, 3),
            "length_score": round(length_score, 3),
            "relevance_score": round(relevance_score, 3),
            "quality_score": round(quality_score, 3),
            "structure_score": round(structure_score, 3),
            "spam_penalty": round(spam_penalty, 3),
        }

    def validate_document_text(self, text: str, title: str = "",
                               min_length: Optional[int] = None,
                               max_length: Optional[int] = None,
                               relevance_threshold: Optional[float] = None) -> Tuple[bool, Dict[str, float]]:
        """统一的文档验证：长度+质量+相关性+字母占比"""
        min_len = min_length if min_length is not None else self.config.min_doc_length
        max_len = max_length if max_length is not None else self.config.max_doc_length
        rel_thr = relevance_threshold if relevance_threshold is not None else self.config.relevance_threshold

        content = (text or "").strip()
        length_valid = min_len <= len(content) <= max_len

        eval_result = self.evaluate_content(content, title)
        relevance_score = eval_result.get("relevance_score", 0.0)

        # 字母比例（用于过滤符号/数字噪音）
        total_chars = len(content)
        alpha_ratio = (sum(1 for c in content if c.isalpha()) / total_chars) if total_chars > 0 else 0.0
        alpha_ok = alpha_ratio >= self.config.min_alpha_ratio

        is_valid = (
            length_valid
            and eval_result["overall_score"] >= self.config.min_search_quality_threshold
            and relevance_score >= rel_thr
            and alpha_ok
        )

        return is_valid, {
            "length_valid": length_valid,
            "quality_valid": eval_result["overall_score"] >= self.config.min_search_quality_threshold,
            "relevance_score": relevance_score,
            "alpha_ratio": round(alpha_ratio, 3),
            "word_count": len(content.split()),
            "char_count": total_chars,
            "is_valid": is_valid,
            "relevance_threshold": rel_thr,
            "overall_quality_score": eval_result.get("overall_score", 0.0),
        }

    # ============ 分块阶段 ============
    def evaluate_chunk_quality(self, chunk_text: str, metadata: Optional[Dict] = None) -> float:
        """
        统一的分块质量评估，使用更合理的评分标准
        """
        if not chunk_text or len(chunk_text.strip()) < 10:
            return 0.0

        text_lower = chunk_text.lower()
        words = text_lower.split()
        word_count = len(words)

        # 长度评分 - 扩大合理长度范围
        if 30 <= word_count <= 400:
            length_score = 1.0
        elif 20 <= word_count < 30 or 400 < word_count <= 600:
            length_score = 0.8
        elif 15 <= word_count < 20 or 600 < word_count <= 800:
            length_score = 0.6
        elif word_count < 15:
            length_score = 0.3
        else:
            length_score = 0.5  # 超长文本给予中等分数

        # 相关性评分 - 降低要求，更实际
        kw_count = sum(1 for w in words if any(kw in w for kw in self.DREAM_KEYWORDS))
        qi_count = sum(1 for w in words if any(qi in w for qi in self.QUALITY_INDICATORS))
        if words:
            relevance_density = (kw_count + qi_count * 0.5) / len(words)
            relevance_score = min(1.0, relevance_density * 50)  # 降低要求：2%密度即可满分
        else:
            relevance_score = 0.0

        # 连贯性评分 - 简化算法
        sentences = [s.strip() for s in re.split(r'[.!?]+', chunk_text) if s.strip()]
        if len(sentences) >= 2:
            # 基于句子数量和平均长度的简单评分
            avg_sentence_len = sum(len(s.split()) for s in sentences) / len(sentences)
            if 8 <= avg_sentence_len <= 25:  # 合理的句子长度
                coherence_score = 1.0
            elif 5 <= avg_sentence_len < 8 or 25 < avg_sentence_len <= 40:
                coherence_score = 0.8
            else:
                coherence_score = 0.6
        else:
            coherence_score = 0.7  # 单句或无句也给予合理分数

        # 结构评分 - 保持不变
        structure_score = 0.0
        if re.search(r'^#+\s|<h[1-6]>', chunk_text, re.MULTILINE | re.IGNORECASE):
            structure_score += 0.3
        if chunk_text.count('\n\n') >= 1:
            structure_score += 0.3
        if re.search(r'^\s*[-*+]\s|^\s*\d+\.\s', chunk_text, re.MULTILINE):
            structure_score += 0.2
        if len(re.findall(r'[.!?]+', chunk_text)) >= 2:
            structure_score += 0.2
        structure_score = min(1.0, structure_score)

        # 完整性评分 - 稍微放宽标准
        s = chunk_text.strip()
        if re.search(r'[.!?]\s*$', s):
            completeness_score = 1.0
        elif re.search(r'[,;:]\s*$', s):  # 添加冒号
            completeness_score = 0.6
        elif s.endswith(("and", "or", "but", "the", "a", "an", "in", "of", "to")):
            completeness_score = 0.3
        else:
            completeness_score = 0.8  # 其他情况给予较高分数

        overall = (length_score * 0.25 + relevance_score * 0.20 + coherence_score * 0.20 +
                   structure_score * 0.20 + completeness_score * 0.15)

        return round(overall, 3)