from datetime import timedelta, date
from typing import Dict, List, Any, Optional, Tuple
from django.utils import timezone
from django.db.models import Count, Avg, Q
from django.db.models.functions import TruncDate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.dream.models import Dream, Tag, DreamCategory


def _get_date_range(period: str) -> Optional[date]:
    """获取时间范围的起始日期"""
    today = timezone.now().date()
    
    period_mapping = {
        'year': today.replace(month=1, day=1),
        'month': today.replace(day=1),
        'week': today - timedelta(days=today.weekday()),
        'day': today,
    }
    
    return period_mapping.get(period)


def _process_time_series_data(queryset, date_field: str = 'dream_day') -> Tuple[List[str], List[Optional[float]], List[Optional[float]]]:
    """处理时间序列数据的通用方法"""
    dates = []
    quality_data = []
    duration_data = []
    
    for item in queryset:
        dates.append(item[date_field].strftime('%Y-%m-%d'))
        quality_data.append(float(item['avg_quality']) if item['avg_quality'] else None)
        
        # 将 timedelta 转换为小时数
        if item.get('avg_duration'):
            total_seconds = item['avg_duration'].total_seconds()
            hours = round(total_seconds / 3600, 1)
            duration_data.append(hours)
        else:
            duration_data.append(None)
    
    return dates, quality_data, duration_data


def _build_distribution_series(data_dict: Dict[Any, int], categories: List[Any]) -> List[int]:
    """构建分布序列的通用方法"""
    return [data_dict.get(category, 0) for category in categories]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dream_statistics(request) -> Response:
    """
    获取梦境统计数据
    
    Args:
        request: HTTP请求对象
        
    Query Parameters:
        period: 时间范围 ('all', 'year', 'month', 'week', 'day')
        
    Returns:
        Response: 包含统计数据的响应
    """
    period = request.query_params.get('period', 'all')
    user = request.user
    
    # 获取时间范围过滤的用户梦境查询集
    user_dreams = Dream.objects.filter(user=user)
    start_date = _get_date_range(period)
    if start_date:
        user_dreams = user_dreams.filter(dream_date__gte=start_date)
    
    # 一次性聚合获取基础统计数据
    base_stats = user_dreams.aggregate(
        total_dreams=Count('id'),
        total_tags=Count('tags'),
        recurring_count=Count('id', filter=Q(is_recurring=True)),
        avg_lucidity=Avg('lucidity_level'),
        avg_vividness=Avg('vividness'),
    )
    
    # 计算重复梦境百分比
    recurring_percentage = 0
    if base_stats['total_dreams'] > 0:
        recurring_percentage = round(
            (base_stats['recurring_count'] / base_stats['total_dreams']) * 100, 1
        )
    
    # 合并时间序列查询：睡眠趋势和清晰度趋势
    time_series_data = (
        user_dreams
        .annotate(dream_day=TruncDate('dream_date'))
        .values('dream_day')
        .annotate(
            avg_quality=Avg('sleep_quality'),
            avg_duration=Avg('sleep_duration'),
            avg_vividness=Avg('vividness')
        )
        .order_by('dream_day')
    )
    
    # 处理时间序列数据
    dates, quality_data, duration_data = _process_time_series_data(time_series_data)
    clarity_dates = [item['dream_day'].strftime('%Y-%m-%d') for item in time_series_data]
    clarity_series = [
        float(round(item['avg_vividness'], 2)) if item['avg_vividness'] is not None else None
        for item in time_series_data
    ]
    
    # 并行获取分布数据
    distributions = {
        'mood': user_dreams.values('mood_in_dream').annotate(count=Count('id')).exclude(mood_in_dream__isnull=True).exclude(mood_in_dream=''),
        'lucidity': user_dreams.values('lucidity_level').annotate(count=Count('id')).order_by('lucidity_level'),
        'category': user_dreams.values('categories__name', 'categories__color_code').annotate(value=Count('id')).order_by('-value').exclude(categories__name__isnull=True)
    }
    
    # 处理情绪分布 - 返回英文key而不是中文标签
    mood_categories = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
    mood_counts = {item['mood_in_dream']: item['count'] for item in distributions['mood']}
    mood_series = _build_distribution_series(mood_counts, mood_categories)
    mood_labels = mood_categories  # 返回英文key，前端负责翻译
    
    # 处理清醒度分布 - 返回数字索引而不是中文标签
    lucidity_counts = {item['lucidity_level']: item['count'] for item in distributions['lucidity']}
    lucidity_series = _build_distribution_series(lucidity_counts, list(range(6)))
    lucidity_labels = list(range(6))  # 返回0-5的数字索引，前端负责翻译
    
    # 处理类别分布
    category_data = [
        {
            'name': item['categories__name'],  # 返回英文key而不是中文显示名称
            'value': item['value'],
            'color': item['categories__color_code'] or '#6366f1'
        }
        for item in distributions['category'] 
        if item['categories__name']
    ]
    
    # 高频标签排行榜（优化查询）
    tag_leaderboard = {
        tag_type: list(
            Tag.objects
            .filter(dream__in=user_dreams, tag_type=tag_type)
            .values('name')
            .annotate(count=Count('dream'))
            .order_by('-count')[:5]
        )
        for tag_type, _ in Tag.TAG_TYPE_CHOICES
    }
    
    # 重复梦境元素分析（仅在有重复梦境时执行）
    recurring_elements_data = []
    if base_stats['recurring_count'] > 0:
        recurring_dreams = user_dreams.filter(is_recurring=True).values_list('recurring_elements', flat=True)
        elements_count = {}
        
        for elements_str in recurring_dreams:
            if elements_str:
                elements = [e.strip() for e in elements_str.split(',') if e.strip()]
                for element in elements:
                    elements_count[element] = elements_count.get(element, 0) + 1
        
        recurring_elements_data = [
            {'name': name, 'value': count} 
            for name, count in sorted(elements_count.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
    
    # 构建响应数据
    response_data = {
        'period': period,
        'summary': {
            'total_dreams': base_stats['total_dreams'],
            'total_tags': base_stats['total_tags'] or 0,
            'recurring_percentage': recurring_percentage,
            'avg_lucidity': round(base_stats['avg_lucidity'] or 0, 1),
            'avg_vividness': round(base_stats['avg_vividness'] or 0, 1)
        },
        'tag_leaderboard': tag_leaderboard,
        'category_distribution': category_data,
        'mood_distribution': {
            'categories': mood_labels,
            'series': mood_series
        },
        'lucidity_distribution': {
            'categories': lucidity_labels,
            'series': lucidity_series
        },
        'clarity_trends': {
            'dates': clarity_dates,
            'series': clarity_series,
        },
        'sleep_trends': {
            'dates': dates,
            'quality': quality_data,
            'duration': duration_data
        },
        'recurring_elements': recurring_elements_data
    }
    
    return Response(response_data, status=status.HTTP_200_OK)
