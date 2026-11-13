# ==============================================================================
# KAI FLOW STUDIO — Asistente Seguro para Activar Llaves en Vercel (.env.local)
# Este script guarda tus claves localmente en .env.local (protegido por .gitignore)
# sin exponerlas en el historial del chat y abre el importador de Vercel.
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  KAI FLOW STUDIO - ACTIVADOR SEGURO DE LLAVES VERCEL     " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tus llaves NO se subiran a GitHub (.env.local esta en .gitignore)." -ForegroundColor Yellow
Write-Host "Deja en blanco cualquiera que no quieras usar todavia y pulsa Enter." -ForegroundColor Gray
Write-Host ""

$gemini = Read-Host "1. Pega tu GEMINI_API_KEY (Obtén una gratis en https://aistudio.google.com/apikey)"
$hf     = Read-Host "2. Pega tu HF_API_TOKEN (Opcional - https://huggingface.co/settings/tokens)"
$fal    = Read-Host "3. Pega tu FAL_KEY (Opcional - https://fal.ai/dashboard/keys)"
$stripe = Read-Host "4. Pega tu STRIPE_SECRET_KEY (Opcional - https://dashboard.stripe.com/apikeys)"

$secret = -join ((48..57) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

$envContent = @"
GEMINI_API_KEY=$gemini
HF_API_TOKEN=$hf
FAL_KEY=$fal
STRIPE_SECRET_KEY=$stripe
KAI_PASS_SECRET=kai_rd_$secret
"@

Set-Content -Path ".env.local" -Value $envContent -Encoding UTF8
Write-Host ""
Write-Host "[OK] Archivo .env.local generado de forma segura en tu carpeta." -ForegroundColor Green
Write-Host "Abriendo el panel de Environment Variables de Vercel para importar .env.local..." -ForegroundColor Cyan
Start-Process "https://vercel.com/fgw2/kai-manga-flow-studio/settings/environment-variables"
