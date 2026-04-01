from __future__ import annotations

import httpx

from app.core.config import settings


def create_outbound_async_client(*, timeout: httpx.Timeout | float | None = None) -> httpx.AsyncClient:
    """
    Create an AsyncClient for outbound internet requests.

    Policy:
    - Always `trust_env=False` to avoid implicit proxy routing.
    - Use only `AI_PROXY_URL` (settings.ai_proxy_url) when provided.
    """
    kwargs: dict = {
        "trust_env": False,
        "follow_redirects": True,
    }
    if timeout is not None:
        kwargs["timeout"] = timeout
    if settings.ai_proxy_url:
        kwargs["proxy"] = settings.ai_proxy_url
    return httpx.AsyncClient(**kwargs)

