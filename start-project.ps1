$ErrorActionPreference = 'Continue'
$root = "C:\Users\Inezaye Hirwa savior\Documents\KIPS-SMS"

Write-Host "Starting KIPS-SMS backend (port 5000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$root/backend'; npm start 2>&1 | Tee-Object -FilePath '$root/backend-start.log'`"" -WindowStyle Minimized

Start-Sleep -Seconds 3

Write-Host "Starting KIPS-SMS frontend (port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$root/frontend'; npm start 2>&1 | Tee-Object -FilePath '$root/frontend-start.log'`"" -WindowStyle Minimized

Write-Host "Both servers launched. Check backend-start.log and frontend-start.log for output." -ForegroundColor Green
