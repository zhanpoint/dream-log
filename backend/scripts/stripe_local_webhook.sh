#!/usr/bin/env bash
set -euo pipefail

FORWARD_TO=${1:-http://localhost:8000/api/billing/webhook}

if ! command -v stripe >/dev/null 2>&1; then
  echo "Stripe CLI 未安装，请先安装：https://docs.stripe.com/stripe-cli"
  exit 1
fi

echo "启动 Stripe webhook 监听（测试环境）..."
echo "Forward to: ${FORWARD_TO}"
stripe listen --forward-to "${FORWARD_TO}"
