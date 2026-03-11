"""
Dify 批处理脚本：批量调用 Dify 工作流生成梦境符号结构化内容

使用 asyncio + async/await 并发请求，轻量且高效（无多线程开销）。

使用方法（在 backend 根目录）：
    python scripts/symbols/batch_generate.py

配置说明：
    DIFY_API_KEY、DIFY_API_URL 从 backend/.env 加载（与 app.core.config 一致）。
    其余参数在下方「用户配置区」修改。
    最后一批不足 BATCH_SIZE 时自动按余数处理（如 120 个、每批 11 个 → 10 批满 + 1 批 10 个）。
"""

import asyncio
import json
import math
import sys
from pathlib import Path

import httpx

# 确保 backend 根目录在 path 中，以便加载 .env（通过 app.core.config）
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.core.config import settings

# Dify 从 .env 加载
DIFY_API_KEY = settings.dify_api_key
DIFY_API_URL = settings.dify_api_url.rstrip("/")

# ========== 用户配置区（只需修改这里）==========
BATCH_SIZE = 5         # 每批处理的符号数量（建议 8~12）；最后一批不足则取余处理
CONCURRENT_BATCHES = 8  # 同时发起的请求批数（async 并发），建议 2~3，过大易触发限流
DELAY_SECONDS = 3       # 每轮之间的等待秒数
MAX_RETRIES = 3         # 单批最大重试次数
REQUEST_TIMEOUT = 180.0  # 单次请求超时秒数
# ===============================================

SCRIPT_DIR = Path(__file__).parent

# JSON 资源统一放在 backend/src/explorer（scripts 目录不再保留 JSON）
_BACKEND_ROOT = Path(__file__).parent.parent.parent
_RESOURCE_DIR = _BACKEND_ROOT / "src" / "explorer" / "symbols"
INPUT_FILE = _RESOURCE_DIR / "symbols_input.json"
OUTPUT_FILE = _RESOURCE_DIR / "symbols_output.json"
FAILED_FILE = _RESOURCE_DIR / "failed_batches.json"


def load_symbols() -> list[dict]:
    with open(INPUT_FILE, encoding="utf-8") as f:
        return json.load(f)


def load_existing_results() -> list[dict]:
    """加载已有结果（断点续传）；文件为空或非合法 JSON 时视为无历史结果"""
    if not OUTPUT_FILE.exists():
        return []
    try:
        with open(OUTPUT_FILE, encoding="utf-8") as f:
            raw = f.read().strip()
        if not raw:
            return []
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return []


def save_results(results: list[dict]) -> None:
    """将当前完整结果列表重写写入 JSON 文件（非追加：每次写入整个数组，保证断点续传与 import 可读）"""
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)


def save_failed(failed: list[dict]) -> None:
    with open(FAILED_FILE, "w", encoding="utf-8") as f:
        json.dump(failed, f, ensure_ascii=False, indent=2)


async def call_dify(client: httpx.AsyncClient, batch: list[dict]) -> list[dict]:
    """异步调用 Dify API，返回该批结果列表"""
    payload = {
        "inputs": {"symbols": json.dumps(batch, ensure_ascii=False)},
        "response_mode": "blocking",
        "user": "batch-script",
    }
    resp = await client.post(
        DIFY_API_URL,
        headers={
            "Authorization": f"Bearer {DIFY_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()

    outputs = data.get("data", {}).get("outputs", {})
    # Dify 输出节点变量名可能是 "result" 或 "results"，都兼容
    result = outputs.get("result") or outputs.get("results")

    if result is None:
        raise ValueError(f"Dify 返回中缺少 result/results: outputs={list(outputs.keys())}")

    if isinstance(result, str):
        result = json.loads(result)

    if not isinstance(result, list):
        raise ValueError(f"Dify 返回格式异常，result 非数组: {type(result).__name__}")

    return result


async def process_one_batch(
    client: httpx.AsyncClient,
    batch_index: int,
    batch: list[dict],
) -> tuple[int, list[dict] | None, Exception | None]:
    """单批请求（含重试），返回 (batch_index, results 或 None, exception 或 None)"""
    last_error: Exception | None = None
    for _ in range(MAX_RETRIES):
        try:
            results = await call_dify(client, batch)
            return (batch_index, results, None)
        except Exception as e:
            last_error = e
            await asyncio.sleep(5)
    return (batch_index, None, last_error)


async def run() -> None:
    if not DIFY_API_KEY or not DIFY_API_KEY.strip():
        print("错误：未配置 DIFY_API_KEY，请在 backend/.env 中设置 DIFY_API_KEY")
        sys.exit(1)

    symbols = load_symbols()
    total = len(symbols)
    loops = math.ceil(total / BATCH_SIZE)
    remainder = total % BATCH_SIZE
    last_batch_size = remainder if remainder else BATCH_SIZE

    print(f"共 {total} 个符号，每批最多 {BATCH_SIZE} 个，共 {loops} 批（最后一批 {last_batch_size} 个）")
    print(f"异步并发批数 {CONCURRENT_BATCHES}，预计总耗时约 {(loops + CONCURRENT_BATCHES - 1) // CONCURRENT_BATCHES * (20 + DELAY_SECONDS) // 60 + 1} 分钟\n")

    existing = load_existing_results()
    done_slugs: set[str] = set()
    for item in existing:
        slug = item.get("slug") or item.get("name", "")
        if slug:
            done_slugs.add(slug)

    all_results: list[dict] = list(existing)
    failed_batches: list[dict] = []
    success_count = 0
    skip_count = 0

    async with httpx.AsyncClient() as client:
        i = 0
        while i < loops:
            wave: list[tuple[int, list[dict]]] = []
            for _ in range(CONCURRENT_BATCHES):
                if i >= loops:
                    break
                batch = symbols[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
                batch_names = [s["name"] for s in batch]
                already_done = [s["name"] for s in batch if s["name"] in done_slugs]
                if len(already_done) == len(batch):
                    print(f"[{i+1}/{loops}] 跳过（已生成）: {', '.join(batch_names)}")
                    skip_count += len(batch)
                    i += 1
                    continue
                wave.append((i, batch))
                i += 1

            if not wave:
                continue

            batch_indices = [idx for idx, _ in wave]
            names_first = ", ".join(s["name"] for s in wave[0][1])
            print(f"[{batch_indices[0]+1}~{batch_indices[-1]+1}/{loops}] 并发 {len(wave)} 批: {names_first} ...", end="", flush=True)

            tasks = [
                process_one_batch(client, idx, batch)
                for idx, batch in wave
            ]
            completed = await asyncio.gather(*tasks)

            completed.sort(key=lambda x: x[0])
            batch_by_index = {idx: batch for idx, batch in wave}
            any_fail = False
            for bi, results, err in completed:
                batch = batch_by_index[bi]
                if err:
                    failed_batches.append({"batch_index": bi, "symbols": batch, "error": str(err)})
                    any_fail = True
                    # 打印具体错误，便于排查（Dify 成功但脚本报错时能看到原因）
                    print(f"\n    [批{bi+1}] {type(err).__name__}: {err}", flush=True)
                else:
                    all_results.extend(results)  # 内存中追加本批结果
                    success_count += len(results)
                    for r in results:
                        slug = r.get("slug") or r.get("name", "")
                        done_slugs.add(slug)

            # 每轮结束后将当前「完整结果列表」重写写入文件（非按批追加写，便于断点续传与 import_symbols 读取）
            save_results(all_results)
            if any_fail:
                print(" ✗ 本轮有失败")
            else:
                print(f" ✓ ({len(wave)} 批)")

            if i < loops:
                await asyncio.sleep(DELAY_SECONDS)

    if failed_batches:
        save_failed(failed_batches)
        print(f"\n⚠️  {len(failed_batches)} 批失败，已记录到 {FAILED_FILE.name}，可修改后重跑")

    print(f"\n完成！成功 {success_count} 条，跳过 {skip_count} 条，失败 {len(failed_batches)} 批")
    print(f"结果已保存至 {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(run())
