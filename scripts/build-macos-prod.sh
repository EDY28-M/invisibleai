#!/bin/bash
# Compila InvisibleAI para PRODUCCION: macOS (Apple Silicon + Intel) y Windows
# (x86_64, cross-compile con cargo-xwin), en tu Mac y sin gastar minutos de Actions.
#
# Requisitos:
#   - Dependencias instaladas (npm install / pnpm install ya hecho).
#   - La llave privada del updater (la misma cuyo pubkey esta en tauri.conf.json).
#     Por defecto se busca en ~/.tauri/invisibleai.key
#   - .env (raiz) y src-tauri/.env con valores de PRODUCCION
#     (sobre todo VITE_INVISIBLEAI_SERVER apuntando al servidor real).
#
# Uso:
#   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="tu_password_de_la_llave"
#   ./scripts/build-macos-prod.sh
#
# Si tu llave esta en otra ruta o quieres pasar el contenido directo:
#   export TAURI_SIGNING_PRIVATE_KEY="/ruta/a/la/llave"   # o el contenido base64

set -euo pipefail

cd "$(dirname "$0")/.."

# NO_UPDATER=1 -> compila solo el DMG, sin artefactos de auto-updater.
#                No requiere la llave ni la contrasena del updater.
#                Ideal para arreglar la descarga (Gatekeeper) sin tener el password.
NO_UPDATER="${NO_UPDATER:-0}"
EXTRA_ARGS=()

if [ "$NO_UPDATER" = "1" ]; then
  echo ">> Modo DMG-only: sin artefactos de updater (no requiere contrasena)."
  EXTRA_ARGS=(--config '{"bundle":{"createUpdaterArtifacts":false}}')
else
  # --- Preflight: llave del updater ---
  KEY_DEFAULT="$HOME/.tauri/invisibleai.key"
  : "${TAURI_SIGNING_PRIVATE_KEY:=$KEY_DEFAULT}"
  export TAURI_SIGNING_PRIVATE_KEY

  if [ ! -f "$TAURI_SIGNING_PRIVATE_KEY" ] && [ "${#TAURI_SIGNING_PRIVATE_KEY}" -lt 100 ]; then
    echo "ERROR: no encuentro la llave del updater en '$TAURI_SIGNING_PRIVATE_KEY'."
    echo "Exporta TAURI_SIGNING_PRIVATE_KEY con la ruta del archivo o el contenido de tu llave."
    exit 1
  fi

  # La llave rotada no tiene contrasena: por defecto se usa password vacio.
  # Si en el futuro generas una llave CON password, exporta TAURI_SIGNING_PRIVATE_KEY_PASSWORD antes de correr.
  : "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:=}"
  export TAURI_SIGNING_PRIVATE_KEY_PASSWORD
fi

# --- Preflight: env de produccion ---
if [ ! -f .env ] || [ ! -f src-tauri/.env ]; then
  echo "AVISO: falta .env o src-tauri/.env. Asegurate de que existan con valores de PRODUCCION."
fi

# --- Targets de Rust ---
echo ">> Asegurando targets de Rust (aarch64 + x86_64)..."
rustup target add aarch64-apple-darwin x86_64-apple-darwin

# --- Build (mismas flags que el workflow) ---
echo ">> Compilando Apple Silicon (aarch64-apple-darwin)..."
pnpm exec tauri build --target aarch64-apple-darwin --bundles dmg ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}

echo ">> Compilando Intel (x86_64-apple-darwin)..."
pnpm exec tauri build --target x86_64-apple-darwin --bundles dmg ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}

# --- Windows (cross-compile desde macOS con cargo-xwin + NSIS) ---
# Se omite con SKIP_WINDOWS=1. Requiere: target x86_64-pc-windows-msvc, cargo-xwin,
# makensis (brew install nsis) y llvm (brew install llvm, aporta llvm-rc).
if [ "${SKIP_WINDOWS:-0}" != "1" ] && command -v cargo-xwin >/dev/null 2>&1 && command -v makensis >/dev/null 2>&1; then
  echo ">> Compilando Windows (x86_64-pc-windows-msvc, NSIS) via cargo-xwin..."
  rustup target add x86_64-pc-windows-msvc >/dev/null 2>&1 || true
  # llvm-rc (compilador de recursos Windows) suele vivir en el llvm de brew, fuera del PATH:
  if [ -d /opt/homebrew/opt/llvm/bin ]; then export PATH="/opt/homebrew/opt/llvm/bin:$PATH"; fi
  # No-fatal: si makensis falla (roto en macOS Tahoe), avisamos y seguimos para
  # no perder los artefactos de macOS.
  if pnpm exec tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc --bundles nsis ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}; then
    echo ">> Windows OK."
  else
    echo ">> AVISO: el instalador de Windows fallo (makensis de Homebrew crashea en macOS Tahoe)."
    echo ">>        El .exe de la app si compila; para el instalador usa GitHub Actions o una VM Windows."
    echo ">>        Continuo con macOS..."
  fi
else
  echo ">> (Windows omitido: falta cargo-xwin/makensis, o SKIP_WINDOWS=1)"
fi

# --- Resultado ---
echo ""
echo "===================== ARTEFACTOS ====================="
find src-tauri/target -path '*release/bundle/dmg/*.dmg' -print 2>/dev/null || true
find src-tauri/target -path '*release/bundle/macos/*.app.tar.gz*' -print 2>/dev/null || true
find src-tauri/target -path '*release/bundle/nsis/*.exe' -print 2>/dev/null || true
echo "======================================================"
echo "Los .dmg (macOS) y el -setup.exe (Windows) son para que la gente descargue."
echo "Los .app.tar.gz + .sig son para el auto-updater (subir junto al release)."

# --- Reunir instaladores en releases/ (raiz del proyecto, fuera de target/) ---
# Esta carpeta esta en .gitignore: no se sube a GitHub.
REL="releases"
mkdir -p "$REL"
find src-tauri/target -path '*release/bundle/dmg/*.dmg'          -exec cp -f {} "$REL/" \; 2>/dev/null || true
find src-tauri/target -path '*release/bundle/nsis/*-setup.exe'   -exec cp -f {} "$REL/" \; 2>/dev/null || true
find src-tauri/target -path '*release/bundle/macos/*.app.tar.gz*' -exec cp -f {} "$REL/" \; 2>/dev/null || true
find src-tauri/target -path '*release/bundle/nsis/*.sig'         -exec cp -f {} "$REL/" \; 2>/dev/null || true
echo ""
echo ">> Instaladores reunidos en: $(pwd)/$REL/"
ls -lh "$REL/" 2>/dev/null || true
echo ""
echo "Para publicar SIN Actions (requiere gh: brew install gh && gh auth login):"
echo "  gh release create app-v\$(node -p \"require('./package.json').version\") \\"
echo "    src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg \\"
echo "    src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/*.dmg \\"
echo "    --title \"InvisibleAI v\$(node -p \"require('./package.json').version\")\" --generate-notes"
