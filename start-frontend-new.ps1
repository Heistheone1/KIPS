Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Set-Location "C:\Users\Inezaye Hirwa savior\documents\KIPS-SMS/frontend"
npm run dev > "C:\Users\Inezaye Hirwa savior\documents\KIPS-SMS/frontend-dev-new.log" 2>&1
