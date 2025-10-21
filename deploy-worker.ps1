# Deploy Worker Service to Railway
# Run this script to deploy the worker service

Write-Host "Deploying Worker Service to Railway..." -ForegroundColor Cyan
Write-Host ""

# Deploy
Write-Host "Step: Deploying..." -ForegroundColor Yellow
railway up

Write-Host ""
Write-Host "Deployment initiated!" -ForegroundColor Green
Write-Host "Checking logs..." -ForegroundColor Yellow
Write-Host ""

# Wait a bit for deployment to start
Start-Sleep -Seconds 5

# Show logs
railway logs
