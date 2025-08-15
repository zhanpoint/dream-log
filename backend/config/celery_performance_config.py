"""
Celery 性能优化配置建议
为梦境分析任务优化的Celery配置
"""

# 推荐的Celery配置（添加到settings中）
CELERY_PERFORMANCE_SETTINGS = {
    # 任务执行配置
    'task_acks_late': True,  # 任务完成后才确认，确保可靠性
    'task_reject_on_worker_lost': True,  # 工作进程丢失时拒绝任务
    
    # 预取配置
    'worker_prefetch_multiplier': 2,  # 减少预取数量，优化内存使用
    
    # 序列化配置
    'task_serializer': 'json',
    'accept_content': ['json'],
    'result_serializer': 'json',
    
    # 结果存储配置
    'result_expires': 3600,  # 结果1小时过期
    'result_cache_max': 10000,  # 最大缓存结果数
    
    # 任务路由配置
    'task_routes': {
        'apps.ai_services.tasks.dream_analysis_tasks.analyze_dream_task': {
            'queue': 'dream_analysis',
            'routing_key': 'dream_analysis',
        },
    },
    
    # 队列配置
    'task_default_queue': 'default',
    'task_queues': {
        'dream_analysis': {
            'exchange': 'dream_analysis',
            'exchange_type': 'direct',
            'routing_key': 'dream_analysis',
        },
    },
    
    # 连接配置
    'broker_connection_retry_on_startup': True,
    'broker_connection_retry': True,
    'broker_connection_max_retries': 5,
    
    # 性能监控
    'worker_send_task_events': True,
    'task_send_sent_event': True,
}

# 推荐的启动命令
RECOMMENDED_WORKER_COMMANDS = {
    'development': 'celery -A config worker --loglevel=info --concurrency=2 --pool=threads',
    'production_cpu_bound': 'celery -A config worker --loglevel=info --concurrency=4 --pool=prefork',
    'production_io_bound': 'celery -A config worker --loglevel=info --concurrency=8 --pool=gevent',
    'mixed_workload': 'celery -A config worker --loglevel=info --concurrency=4 --pool=threads',
}

# 环境变量建议
ENVIRONMENT_VARIABLES = {
    'CELERY_WORKER_CONCURRENCY': '4',  # 根据CPU核心数调整
    'CELERY_WORKER_POOL': 'threads',   # 适合IO密集型任务
    'CELERY_TASK_TIME_LIMIT': '150',   # 任务硬超时
    'CELERY_TASK_SOFT_TIME_LIMIT': '120',  # 任务软超时
}

