#!/usr/bin/env sh
set -eu
# exec：用 uvicorn 替换当前 shell，便于接收 SIGTERM（compose 已设 init: true 时由 tini 转发信号）
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
