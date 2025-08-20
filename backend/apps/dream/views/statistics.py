from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Avg, Sum, Q, F
from django.db.models.functions import TruncDate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.dream.models import Dream, Tag


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dream_statistics(request):
    """
    获取梦境统计数据
    参数:
        period: 时间范围 ('all', 'year', 'month', 'week', 'day')
    """
    period = request.query_params.get('period', 'all')
    user = request.user
    
    # 根据时间范围过滤梦境数据
    today = timezone.now().date()
    start_date = None
    
    if period == 'year':
        start_date = today.replace(month=1, day=1)
    elif period == 'month':
        start_date = today.replace(day=1)
    elif period == 'week':
        start_date = today - timedelta(days=today.weekday())
    elif period == 'day':
        start_date = today
    
    # 获取用户梦境查询集
    user_dreams = Dream.objects.filter(user=user)
    if start_date:
        user_dreams = user_dreams.filter(dream_date__gte=start_date)
    
    # 1. 计算梦境总数和标签总数
    total_dreams = user_dreams.count()
    total_tags = user_dreams.aggregate(
        total_tags=Count('tags')
    )['total_tags'] or 0
    
    # 2. 高频标签排行榜（按标签类型分组）
    tag_leaderboard = {}
    for tag_type, tag_type_display in Tag.TAG_TYPE_CHOICES:
        top_tags = (
            Tag.objects
            .filter(dream__in=user_dreams, tag_type=tag_type)
            .values('name')
            .annotate(count=Count('dream'))
            .order_by('-count')[:5]
        )
        tag_leaderboard[tag_type] = list(top_tags)
    
    # 3. 梦境类别占比
    from apps.dream.models import DreamCategory
    
    category_distribution = (
        user_dreams
        .values('categories__name', 'categories__color_code')
        .annotate(value=Count('id'))
        .order_by('-value')
        .exclude(categories__name__isnull=True)
    )
    
    # 处理类别数据，确保有颜色值和中文名称
    category_data = []
    category_choices_dict = dict(DreamCategory.CATEGORY_CHOICES)
    
    for item in category_distribution:
        if item['categories__name']:
            # 获取中文显示名称
            display_name = category_choices_dict.get(
                item['categories__name'], 
                item['categories__name']
            )
            category_data.append({
                'name': display_name,
                'value': item['value'],
                'color': item['categories__color_code'] or '#6366f1'
            })
    
    # 4. 梦境情绪分布
    mood_distribution = (
        user_dreams
        .values('mood_in_dream')
        .annotate(count=Count('id'))
        .exclude(mood_in_dream__isnull=True)
        .exclude(mood_in_dream='')
    )
    
    # 整理情绪数据为前端需要的格式
    mood_categories = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
    mood_labels = ['非常消极', '消极', '中性', '积极', '非常积极']
    mood_counts = {item['mood_in_dream']: item['count'] for item in mood_distribution}
    mood_series = [mood_counts.get(category, 0) for category in mood_categories]
    
    # 5. 睡眠质量与时长趋势
    sleep_trends = (
        user_dreams
        .annotate(dream_day=TruncDate('dream_date'))
        .values('dream_day')
        .annotate(
            avg_quality=Avg('sleep_quality'),
            avg_duration=Avg('sleep_duration')
        )
        .order_by('dream_day')
    )
    
    # 处理睡眠趋势数据
    dates = []
    quality_data = []
    duration_data = []
    
    for trend in sleep_trends:
        dates.append(trend['dream_day'].strftime('%Y-%m-%d'))
        quality_data.append(float(trend['avg_quality']) if trend['avg_quality'] else None)
        
        # 将 timedelta 转换为小时数
        if trend['avg_duration']:
            total_seconds = trend['avg_duration'].total_seconds()
            hours = round(total_seconds / 3600, 1)
            duration_data.append(hours)
        else:
            duration_data.append(None)
    
    # 6. 额外统计：清醒度分布
    lucidity_distribution = (
        user_dreams
        .values('lucidity_level')
        .annotate(count=Count('id'))
        .order_by('lucidity_level')
    )
    
    lucidity_labels = ['完全无意识', '轻微意识', '部分清醒', '较为清醒', '完全清醒', '超清醒状态']
    lucidity_counts = {item['lucidity_level']: item['count'] for item in lucidity_distribution}
    lucidity_series = [lucidity_counts.get(i, 0) for i in range(6)]
    
    # 7. 额外统计：重复梦境比例和内容分析
    recurring_stats = user_dreams.aggregate(
        recurring_count=Count('id', filter=Q(is_recurring=True)),
        total_count=Count('id')
    )
    recurring_percentage = 0
    if recurring_stats['total_count'] > 0:
        recurring_percentage = round(
            (recurring_stats['recurring_count'] / recurring_stats['total_count']) * 100, 
            1
        )
    
    # 重复梦境元素分析
    recurring_elements_data = []
    if recurring_stats['recurring_count'] > 0:
        recurring_dreams = user_dreams.filter(is_recurring=True)
        elements_count = {}
        for dream in recurring_dreams:
            if dream.recurring_elements:
                # 简单分词处理重复元素
                elements = [e.strip() for e in dream.recurring_elements.split(',') if e.strip()]
                for element in elements:
                    elements_count[element] = elements_count.get(element, 0) + 1
        
        # 转换为前端需要的格式，取前5个最常见的元素
        recurring_elements_data = [
            {'name': name, 'value': count} 
            for name, count in sorted(elements_count.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
    
    # 构建响应数据
    response_data = {
        'period': period,
        'summary': {
            'total_dreams': total_dreams,
            'total_tags': total_tags,
            'recurring_percentage': recurring_percentage,
            'avg_lucidity': round(
                user_dreams.aggregate(avg=Avg('lucidity_level'))['avg'] or 0, 
                1
            ),
            'avg_vividness': round(
                user_dreams.aggregate(avg=Avg('vividness'))['avg'] or 0,
                1
            )
        },
        'tag_leaderboard': tag_leaderboard or {},
        'category_distribution': category_data or [],
        'mood_distribution': {
            'categories': mood_labels,
            'series': mood_series
        },
        'lucidity_distribution': {
            'categories': lucidity_labels,
            'series': lucidity_series
        },
        'sleep_trends': {
            'dates': dates or [],
            'quality': quality_data or [],
            'duration': duration_data or []
        },
        'recurring_elements': recurring_elements_data or []
    }
    
    return Response(response_data, status=status.HTTP_200_OK)
