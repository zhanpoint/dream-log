from __future__ import annotations

import httpx

from app.core.config import settings
from app.config.ai_models import OPENROUTER_BASE_URL

_sdk_client = None


def _build_httpx_clients() -> tuple[httpx.Client, httpx.AsyncClient]:
    """
    Create httpx clients for OpenRouter SDK usage.

    We intentionally do NOT rely on HTTP(S)_PROXY env vars (trust_env=False).
    If AI_PROXY_URL is set, we apply it explicitly via httpx `proxy=...`.
    """
    proxy_url = settings.ai_proxy_url
    common: dict = {"follow_redirects": True, "trust_env": False}
    if proxy_url:
        common["proxy"] = proxy_url
    return httpx.Client(**common), httpx.AsyncClient(**common)


def get_openrouter_sdk_client(*, max_retries: int = 2):
    """
    Return a singleton `openrouter.OpenRouter` SDK client.

    This keeps outbound traffic deterministic: proxy is controlled only by
    `AI_PROXY_URL`, not by ambient proxy environment variables.
    """
    global _sdk_client
    if _sdk_client is not None:
        return _sdk_client

    import openrouter
    from openrouter.utils import BackoffStrategy, RetryConfig

    client, async_client = _build_httpx_clients()

    kwargs: dict = {
        "api_key": (settings.openrouter_api_key or "").strip(),
        "server_url": OPENROUTER_BASE_URL,
        "client": client,
        "async_client": async_client,
    }

    if max_retries and max_retries > 0:
        kwargs["retry_config"] = RetryConfig(
            strategy="backoff",
            backoff=BackoffStrategy(
                initial_interval=500,
                max_interval=60_000,
                exponent=1.5,
                max_elapsed_time=max_retries * 150_000,
            ),
            retry_connection_errors=True,
        )

    _sdk_client = openrouter.OpenRouter(**kwargs)
    return _sdk_client

