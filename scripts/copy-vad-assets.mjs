// Copia los assets de @ricky0123/vad-web y onnxruntime-web desde node_modules a
// public/vad/, para que el modo "Multihilo" (VAD de micrófono) cargue el modelo
// ONNX, el worklet y el runtime WASM DESDE LA APP (offline) en vez de bajarlos
// del CDN de jsDelivr en tiempo de ejecución.
//
// Se ejecuta automáticamente antes de `dev` y `build` (ver package.json). Es
// idempotente: solo copia si falta el archivo o cambió de tamaño.
//
// Los archivos quedan en public/vad/ (ignorado por git): se regeneran desde
// node_modules en cada máquina tras `pnpm install`, así siempre coinciden con
// la versión instalada de la librería.

import { createRequire } from "node:module";
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const destDir = join(projectRoot, "public", "vad");

/** Carpeta dist/ de un paquete, resuelta vía su package.json. */
function distDir(pkgName, fromRequire = require) {
  const pkgJson = fromRequire.resolve(`${pkgName}/package.json`);
  return join(dirname(pkgJson), "dist");
}

const jobs = [];

try {
  const vadPkgJson = require.resolve("@ricky0123/vad-web/package.json");
  const vadDist = join(dirname(vadPkgJson), "dist");
  jobs.push(
    [join(vadDist, "vad.worklet.bundle.min.js"), "vad.worklet.bundle.min.js"],
    [join(vadDist, "silero_vad_legacy.onnx"), "silero_vad_legacy.onnx"]
  );

  // onnxruntime-web es dependencia (transitiva) de vad-web: se resuelve desde
  // el contexto de vad-web para que funcione con el layout de pnpm.
  const requireFromVad = createRequire(vadPkgJson);
  const ortDist = distDir("onnxruntime-web", requireFromVad);
  // numThreads = 1 (forzado en MicVadCapturer) → solo se usan las variantes
  // NO-threaded. Copiamos plain + simd; el runtime elige según soporte SIMD.
  jobs.push(
    [join(ortDist, "ort-wasm.wasm"), "ort-wasm.wasm"],
    [join(ortDist, "ort-wasm-simd.wasm"), "ort-wasm-simd.wasm"]
  );
} catch (err) {
  console.warn(
    "[copy-vad-assets] No se pudieron resolver las dependencias de VAD:",
    err.message,
    "\n  → El modo Multihilo no funcionará hasta ejecutar `pnpm install`."
  );
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

let copied = 0;
let skipped = 0;
let missing = 0;

for (const [src, name] of jobs) {
  if (!existsSync(src)) {
    console.warn(`[copy-vad-assets] No encontrado en node_modules: ${name}`);
    missing++;
    continue;
  }
  const dest = join(destDir, name);
  if (existsSync(dest) && statSync(dest).size === statSync(src).size) {
    skipped++;
    continue;
  }
  copyFileSync(src, dest);
  copied++;
  console.log(`[copy-vad-assets] ${name} ✓`);
}

console.log(
  `[copy-vad-assets] Listo → public/vad/ (${copied} copiados, ${skipped} sin cambios${
    missing ? `, ${missing} faltantes` : ""
  })`
);
