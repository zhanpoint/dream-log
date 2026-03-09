"""
洞察报告系统配置
"""


class InsightConfig:
    """洞察报告配置"""

    # ========== 月度报告 ==========
    MONTHLY_REPORT_ENABLED = True
    MONTHLY_MIN_DREAMS = 5       # 月报最少5条

    # ========== 周报 ==========
    WEEKLY_REPORT_ENABLED = True
    WEEKLY_MIN_DREAMS = 3        # 周报最少3条

    # ========== 年度回顾 ==========
    ANNUAL_REPORT_ENABLED = True
    ANNUAL_MIN_DREAMS = 10

    # ========== 专题分析 ==========
    THEME_MIN_DAYS_EMOTION = 7   # 情绪健康分析建议最少7天
    THEME_MIN_DAYS_SLEEP = 7     # 睡眠质量分析建议最少7天
    THEME_MIN_DAYS_PATTERN = 30  # 梦境主题建议最少30天

    # ========== AI 并发控制 ==========
    AI_CONCURRENT_ENABLED = False
    AI_MAX_CONCURRENT = 3
    AI_REQUEST_DELAY = 2.0

    # ========== 定时任务 ==========
    MONTHLY_REPORT_CRON_HOUR = 9
    WEEKLY_REPORT_CRON_HOUR = 9
    ANNUAL_REPORT_CRON_HOUR = 9

    # ========== 数据管理 ==========
    INSIGHT_EXPIRE_MONTHS = 6

    # 新增：各类报告过期策略（用于清理/存储生命周期）
    WEEKLY_EXPIRE_WEEKS = 16     # 周报保留16周（约4个月）
    ANNUAL_EXPIRE_YEARS = 5      # 年度回顾保留5年

    EMOTION_EXPIRE_DAYS = 90     # 情绪健康分析保留3个月
    SLEEP_EXPIRE_DAYS = 90       # 睡眠质量分析保留3个月
    THEME_EXPIRE_DAYS = 180      # 梦境主题分析保留6个月
