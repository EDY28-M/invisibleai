#!/usr/bin/env node
/**
 * clean-data.mjs — Borra TODOS los datos locales de InvisibleAI en esta máquina.
 *
 * Por qué existe:
 *   La app NO empaqueta datos de usuario en el build (solo se incluyen Info.plist
 *   y el .desktop). La base de datos SQLite, el `secure_storage.json` (licencia +
 *   instanceId) y el localStorage del webview se crean en tiempo de ejecución, en
 *   la carpeta de datos del usuario. Como el build de desarrollo y el de producción
 *   comparten el mismo identificador (`com.edy28.invisibleai`), al probar el build
 *   en TU Mac ves tus datos de desarrollo.
 *
 *   Este script borra esas carpetas para dejar la app "de fábrica": al volver a
 *   abrirla, arranca limpia (genera un instanceId nuevo y la data semilla de la app).
 *
 * Uso:
 *   pnpm clean:data            # borra los datos locales
 *   pnpm clean:data --dry-run  # solo muestra qué borraría, sin borrar nada
 *   (también se ejecuta solo antes de `pnpm tauri build` — ver tauri.conf.json)
 *
 * Seguro: solo toca rutas derivadas del identificador de la app. Si una ruta no
 * existe, la ignora. Nunca falla el build (siempre termina con código 0).
 */

import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const IDENTIFIER = "com.edy28.invisibleai";
const PRODUCT = "InvisibleAI";
const home = os.homedir();

/** Devuelve las rutas de datos a borrar según el sistema operativo. */
function dataPaths() {
  const p = process.platform;

  if (p === "darwin") {
    const L = path.join(home, "Library");
    return [
      // SQLite (invisibleai.db) + secure_storage.json + datos de la app
      path.join(L, "Application Support", IDENTIFIER),
      // localStorage / IndexedDB del WKWebView (app no sandbox)
      path.join(L, "WebKit", IDENTIFIER),
      path.join(L, "Caches", IDENTIFIER),
      path.join(L, "HTTPStorages", IDENTIFIER),
      path.join(L, "Preferences", `${IDENTIFIER}.plist`),
      path.join(L, "Saved Application State", `${IDENTIFIER}.savedState`),
    ];
  }

  if (p === "win32") {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    const localAppData =
      process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    return [
      path.join(appData, IDENTIFIER),
      path.join(localAppData, IDENTIFIER),
      path.join(appData, PRODUCT),
      path.join(localAppData, PRODUCT),
      // Caché del WebView2 (Edge) usada por Tauri en Windows
      path.join(localAppData, `${PRODUCT}`, "EBWebView"),
    ];
  }

  // linux
  return [
    path.join(home, ".local", "share", IDENTIFIER),
    path.join(home, ".config", IDENTIFIER),
    path.join(home, ".cache", IDENTIFIER),
  ];
}

const DRY_RUN = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";

console.log(`\n🧹 InvisibleAI · limpieza de datos locales (${process.platform})`);
console.log(`   identificador: ${IDENTIFIER}${DRY_RUN ? "  ·  DRY-RUN (no borra nada)" : ""}\n`);

let removed = 0;
for (const target of dataPaths()) {
  try {
    if (fs.existsSync(target)) {
      if (DRY_RUN) {
        console.log(`  • se borraría  ${target}`);
      } else {
        fs.rmSync(target, { recursive: true, force: true });
        console.log(`  ✓ borrado  ${target}`);
      }
      removed++;
    }
  } catch (err) {
    // No abortar el build por un fallo de borrado (p. ej. archivo en uso).
    console.warn(`  ⚠ no se pudo borrar ${target}: ${err.message}`);
  }
}

console.log(
  removed > 0
    ? DRY_RUN
      ? `\n🔎 DRY-RUN: ${removed} ubicación(es) se borrarían. Ejecuta sin --dry-run para borrar.\n`
      : `\n✅ Listo: ${removed} ubicación(es) borradas. La app arrancará limpia.\n`
    : `\n✨ Ya estaba limpio: no había datos locales que borrar.\n`
);

// Nunca fallar el build.
process.exit(0);
