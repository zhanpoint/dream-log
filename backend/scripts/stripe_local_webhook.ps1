param(
  [string]$ForwardTo = "http://localhost:8000/api/billing/webhook"
)

if (-not (Get-Command stripe -ErrorAction SilentlyContinue)) {
  Write-Host "Stripe CLI 未安装，请先安装：https://docs.stripe.com/stripe-cli" -ForegroundColor Yellow
  exit 1
}

Write-Host "启动 Stripe webhook 监听（测试环境）..." -ForegroundColor Cyan
Write-Host "Forward to: $ForwardTo" -ForegroundColor Cyan
stripe listen --forward-to $ForwardTo
