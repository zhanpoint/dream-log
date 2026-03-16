#!/usr/bin/env bash
set -euo pipefail

EVENT_TYPE=${1:-checkout.session.completed}

if ! command -v stripe >/dev/null 2>&1; then
  echo "Stripe CLI 未安装，请先安装：https://docs.stripe.com/stripe-cli"
  exit 1
fi

echo "触发 Stripe 测试事件: ${EVENT_TYPE}"
stripe trigger "${EVENT_TYPE}"
