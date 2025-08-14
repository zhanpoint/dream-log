"""
梦境知识库搜索查询模板
用于生成高质量的搜索查询，获取相关的梦境解析资源
"""
import logging
import random
from typing import List, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class DreamSearchCategory(Enum):
    """梦境搜索类别枚举"""
    SYMBOLS = "symbols"           # 梦境象征
    PSYCHOLOGY = "psychology"     # 心理学解释
    SCIENCE = "science"          # 科学研究
    INTERPRETATION = "interpretation"  # 解梦方法


class DreamSearchTemplates:
    """
    V3.0 - 遵循Tavily最佳实践的梦境知识库搜索查询生成器
    - 使用简洁、关键词驱动的查询（<400字符）
    - 为每个主题生成独立的高质量查询
    - 优化搜索相关性和结果质量
    """
    
    # 基础查询模板 - 遵循Tavily最佳实践，简洁且高效
    # 格式："{主题} {搜索维度关键词} {排除词}"
    BASE_TEMPLATES = {
        "psychology": '"{topic}" dream psychology interpretation freud jung academic study research',
        "science": '"{topic}" dream neuroscience REM sleep research study',
        "cultural": '"{topic}" dream symbolism cultural meaning mythology analysis',
        "therapy": '"{topic}" dream therapy analysis treatment clinical',
        "academic": '"{topic}" dream academic research journal publication study'
    }
    
    # 高质量来源关键词 - 用于提升搜索结果质量
    QUALITY_KEYWORDS = [
        "psychology research",
        "scientific study", 
        "academic analysis",
        "clinical research",
        "peer reviewed"
    ]
    
    # 排除低质量内容的关键词
    EXCLUSION_KEYWORDS = [
        "-周公解梦", "-算命", "-占卜", "-风水", "-星座",
        "-dreammoods", "-dreamdictionary", "-forum"
    ]

    # === 用于全面搜索的主题库 ===
    TOPICS = {
        DreamSearchCategory.SYMBOLS: [
            # 自然元素
            "水", "火", "土", "风", "雷电", "雨", "雪", "冰", "雾", "云",
            # 空间与运动
            "飞行", "坠落", "漂浮", "奔跑", "行走", "跳跃", "游泳", "潜水", "上升", "下降",
            # 追逐与逃离
            "追逐", "被追赶", "逃跑", "躲藏", "寻找", "迷路", "被困", "逃脱",
            # 建筑与结构
            "房屋", "房间", "门", "窗户", "楼梯", "电梯", "走廊", "地下室", "阁楼", "城堡",
            "桥", "隧道", "墙", "栅栏", "迷宫", "塔", "寺庙", "教堂", "学校", "医院",
            # 交通工具
            "汽车", "火车", "飞机", "船", "自行车", "摩托车", "公交车", "地铁", "出租车",
            # 自然景观
            "山", "海洋", "河流", "湖泊", "森林", "沙漠", "草原", "岛屿", "海滩", "峡谷",
            # 动物
            "蛇", "狗", "猫", "鸟", "鱼", "马", "牛", "羊", "老虎", "狮子", "狼", "熊",
            "蝴蝶", "蜘蛛", "蚂蚁", "蜜蜂", "龙", "凤凰", "独角兽",
            # 植物
            "树木", "花朵", "草", "藤蔓", "果实", "种子", "森林", "花园", "盆栽",
            # 物品与工具
            "镜子", "钥匙", "锁", "书", "笔", "刀", "剑", "枪", "电话", "手机", "电脑",
            "时钟", "手表", "钱包", "钱", "珠宝", "衣服", "鞋子", "帽子",
            # 身体部位
            "牙齿", "头发", "眼睛", "手", "脚", "心脏", "大脑", "血液",
            # 抽象概念
            "光", "黑暗", "颜色", "声音", "音乐", "舞蹈", "绘画", "写作", "阅读"
        ],
        DreamSearchCategory.PSYCHOLOGY: [
            # 基础理论
            "潜意识", "集体无意识", "原型", "情结", "防御机制", "投射", "移情", "反移情",
            # 梦境类型
            "焦虑梦", "创伤后应激障碍与梦境", "童年记忆与梦", "重复梦境", "清醒梦", "噩梦", "美梦",
            # 心理过程
            "梦中情绪处理", "自我认同与梦境", "梦境与人格发展", "梦境与心理治疗", "梦境与创造力",
            "梦境与问题解决", "梦境与学习", "梦境与记忆整合", "梦境与情感调节",
            # 特殊现象
            "预知梦", "治愈梦", "指导梦", "警告梦", "补偿梦"
        ],
        DreamSearchCategory.SCIENCE: [
            # 睡眠生理学
            "快速眼动睡眠（REM）的功能", "非快速眼动睡眠（NREM）", "睡眠周期", "睡眠阶段转换",
            "梦境与记忆巩固", "做梦时的大脑活动区域", "梦境与神经递质", "梦境与激素水平",
            # 神经科学
            "清明梦的神经科学基础", "梦境与大脑默认网络", "梦境与杏仁核活动", "梦境与海马体功能",
            "梦境与额叶皮层", "梦境与颞叶活动", "梦境与脑干功能",
            # 认知科学
            "梦境与意识状态", "梦境与注意力", "梦境与工作记忆", "梦境与长期记忆",
            "梦境与语言处理", "梦境与视觉处理", "梦境与空间认知",
            # 临床研究
            "梦境与心理健康", "梦境与睡眠障碍", "梦境与药物影响", "梦境与年龄变化",
            "梦境与性别差异", "梦境与文化背景", "梦境与个体差异"
        ],
        DreamSearchCategory.INTERPRETATION: [
            # 传统方法
            "精神分析解梦技术", "荣格派梦境分析方法", "格式塔疗法与梦境工作", "认知行为疗法对噩梦的干预",
            # 现代技术
            "梦境日记记录法", "梦境符号分析", "梦境情感探索", "梦境角色扮演", "梦境艺术表达",
            "梦境对话技术", "梦境引导想象", "梦境身体感受探索",
            # 专业应用
            "梦境在心理治疗中的应用", "梦境与创伤治疗", "梦境与儿童心理工作", "梦境与团体治疗",
            "梦境与家庭治疗", "梦境与艺术治疗", "梦境与身体治疗",
            # 评估工具
            "梦境内容分析量表", "梦境质量评估", "梦境频率记录", "梦境影响评估",
            "梦境与生活质量关联", "梦境治疗效果评估"
        ]
    }

    @classmethod
    def _generate_optimized_query(cls, topic: str, template_type: str = "psychology") -> str:
        """
        为单个主题生成优化的搜索查询
        
        Args:
            topic: 梦境主题/象征
            template_type: 查询模板类型
            
        Returns:
            优化的搜索查询字符串（<400字符）
        """
        
        # 获取基础模板
        base_query = cls.BASE_TEMPLATES.get(template_type, cls.BASE_TEMPLATES["psychology"])
        
        # 格式化主题
        formatted_query = base_query.format(topic=topic)
        
        # 随机添加一个质量关键词来提升结果相关性
        quality_keyword = random.choice(cls.QUALITY_KEYWORDS)
        formatted_query += f" {quality_keyword}"
        
        # 添加排除关键词
        exclusions = " ".join(cls.EXCLUSION_KEYWORDS[:3])  # 限制排除词数量
        formatted_query += f" {exclusions}"
        
        # 确保查询长度在限制内
        if len(formatted_query) > 380:  # 留20字符缓冲
            # 截断并保持完整性
            formatted_query = formatted_query[:380].rsplit(' ', 1)[0]
            
        return formatted_query
    
    @classmethod
    def _select_diverse_templates(cls, count: int) -> List[str]:
        """选择多样化的模板类型以获得全面的搜索结果"""
        template_types = list(cls.BASE_TEMPLATES.keys())
        if count <= len(template_types):
            return template_types[:count]
        else:
            # 如果需要更多查询，循环使用模板类型
            return (template_types * ((count // len(template_types)) + 1))[:count]

    @classmethod
    def generate_comprehensive_queries(
        cls, 
        categories: Optional[List[DreamSearchCategory]] = None, 
        max_queries_per_category: int = 5,
        sample_percentage: Optional[float] = None
    ) -> List[str]:
        """
        V3.0 - 生成优化的搜索查询，遵循Tavily最佳实践
        
        Args:
            categories: 要搜索的类别列表
            max_queries_per_category: 每个类别的最大查询数量
            sample_percentage: 主题抽样百分比
            
        Returns:
            优化的查询字符串列表
        """
        
        queries = []
        target_categories = categories if categories else list(cls.TOPICS.keys())
        
        for category in target_categories:
            if category in cls.TOPICS:
                topics_for_category = cls.TOPICS[category]
                
                # 抽样主题
                selected_topics = topics_for_category
                if sample_percentage and 0 < sample_percentage <= 1:
                    num_to_sample = int(len(topics_for_category) * sample_percentage)
                    num_to_sample = max(1, min(num_to_sample, max_queries_per_category))
                    selected_topics = random.sample(topics_for_category, k=num_to_sample)
                else:
                    # 限制主题数量以控制API调用成本
                    selected_topics = selected_topics[:max_queries_per_category]
                
                # 为每个主题选择不同的模板类型以获得多样化结果
                template_types = cls._select_diverse_templates(len(selected_topics))
                
                # 为每个主题生成独立的优化查询
                for topic, template_type in zip(selected_topics, template_types):
                    query = cls._generate_optimized_query(topic, template_type)
                    queries.append(query)
        
        return queries

    @classmethod
    def generate_symbol_queries(cls, symbols: List[str], max_queries: int = 5) -> List[str]:
        """
        为梦境象征生成优化的搜索查询
        
        Args:
            symbols: 梦境象征列表
            max_queries: 最大查询数量
            
        Returns:
            优化的查询字符串列表
        """
        if not symbols:
            return []
        
        # 限制象征数量以控制成本
        limited_symbols = symbols[:max_queries]
        
        # 为每个象征选择不同的模板类型
        template_types = cls._select_diverse_templates(len(limited_symbols))
        
        queries = []
        for symbol, template_type in zip(limited_symbols, template_types):
            query = cls._generate_optimized_query(symbol, template_type)
            queries.append(query)
            
        return queries

# 提取常见的梦境象征作为常量，方便在其他模块中直接引用
COMMON_DREAM_SYMBOLS: List[str] = DreamSearchTemplates.TOPICS.get(DreamSearchCategory.SYMBOLS, [])