param(
  [string]$Type = "checkout.session.completed"
)

if (-not (Get-Command stripe -ErrorAction SilentlyContinue)) {
  Write-Host "Stripe CLI 未安装，请先安装：https://docs.stripe.com/stripe-cli" -ForegroundColor Yellow
  exit 1
}

Write-Host "触发 Stripe 测试事件: $Type" -ForegroundColor Cyan
stripe trigger $Type
