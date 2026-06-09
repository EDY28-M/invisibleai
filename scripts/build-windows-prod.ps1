# Compila InvisibleAI para PRODUCCION en WINDOWS: instalador NSIS x64 (.exe),
# y reune el instalador en la carpeta releases\ (igual que el script de macOS).
#
# IMPORTANTE: ejecutar DENTRO de Windows (PowerShell), NO en macOS.
# Genera un build x64 que corre en Intel/AMD y en Windows ARM (por emulacion).
#
# Requisitos (una vez):
#   - Rust (rustup)         -> https://rustup.rs
#   - Node.js + npm
#   - VS Build Tools con "Desktop development with C++" (incluye MSVC x64)
#   - WebView2 (Windows 11 ya lo trae)
#   - Dependencias: npm install
#
# Uso (PowerShell, en la raiz del proyecto InvisibleAI):
#   powershell -ExecutionPolicy Bypass -File .\scripts\build-windows-prod.ps1
#
# Para incluir artefactos del auto-updater (firma), primero exporta la llave:
#   $env:TAURI_SIGNING_PRIVATE_KEY = "C:\ruta\a\invisibleai.key"   # o el contenido
#   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""                    # vacio: la llave no tiene password

$ErrorActionPreference = "Stop"

# Ir a la raiz del proyecto (carpeta padre de \scripts)
Set-Location (Join-Path $PSScriptRoot "..")

# Asegurar el target x64
rustup target add x86_64-pc-windows-msvc | Out-Null

# Sin llave del updater -> compila SOLO el instalador (no requiere firma).
$extra = @()
if ([string]::IsNullOrEmpty($env:TAURI_SIGNING_PRIVATE_KEY)) {
    Write-Host ">> Sin TAURI_SIGNING_PRIVATE_KEY: compilo SIN artefactos de updater (solo instalador)."
    $cfg = Join-Path $env:TEMP "tauri.noupdater.json"
    '{"bundle":{"createUpdaterArtifacts":false}}' | Set-Content -Encoding ASCII -NoNewline $cfg
    $extra = @("--config", $cfg)
} else {
    if ($null -eq $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) { $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "" }
    Write-Host ">> Con llave del updater: el instalador llevara artefactos firmados."
}

Write-Host ">> Compilando Windows x64 (NSIS)..."
pnpm exec tauri build --target x86_64-pc-windows-msvc --bundles nsis @extra
if ($LASTEXITCODE -ne 0) { throw "El build de Tauri fallo (codigo $LASTEXITCODE)." }

# Reunir instaladores en releases\ (esta en .gitignore: no se sube a GitHub)
$rel = "releases"
New-Item -ItemType Directory -Force -Path $rel | Out-Null
Get-ChildItem -Recurse -Path "src-tauri\target" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match "\\nsis\\" -and ($_.Name -like "*-setup.exe" -or $_.Name -like "*-setup.exe.sig") } |
    ForEach-Object { Copy-Item $_.FullName $rel -Force }

Write-Host ""
Write-Host ">> Instaladores reunidos en: $((Resolve-Path $rel).Path)"
Get-ChildItem $rel | Format-Table Name, Length -AutoSize
