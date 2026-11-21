$root = "C:\Users\Inezaye Hirwa savior\Documents\KIPS-SMS"

Write-Host "Starting KIPS-SMS frontend (npm run dev, port 3000)..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$root/frontend'; npm run dev 2>&1 | Tee-Object -FilePath '$root/frontend-run.log'`"" -WindowStyle Minimized

Write-Host "Frontend launched. Check frontend-run.log for output. Open http://localhost:3000" -ForegroundColor Green
