"""精选梦境自动策略配置（代码内配置，不走环境变量）。"""

from dataclasses import dataclass


@dataclass(frozen=True)
class FeaturedConfig:
    auto_threshold: float = 70.0
    min_content_length: int = 50
    recalc_window_days: int = 14
    recalc_batch_size: int = 500
    recalc_hourly_enabled: bool = True
    recalc_daily_enabled: bool = True


FEATURED_CONFIG = FeaturedConfig()
