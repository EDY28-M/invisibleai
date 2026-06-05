/**
 * Local CV parser. Runs entirely in the browser — the file never leaves the
 * device. Returns plain text so it can be injected into the chat system prompt
 * regardless of the chat model (works with text-only Llama 3.x as well as
 * multimodal Llama 4, since we never ship the raw file to the model).
 *
 * Supported formats:
 *   - text/plain, text/markdown, .txt, .md, .markdown, .rtf  → FileReader
 *   - application/pdf, .pdf                                  → pdfjs-dist (lazy)
 *   - DOCX                                                   → mammoth (lazy)
 */

const TEXT_EXTENSIONS = [".txt", ".md", ".markdown", ".rtf"];

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type ParsedCv = {
  text: string;
  /** Source kind so the UI can decide which icon / hint to show. */
  kind: "text" | "pdf" | "docx";
};

function hasExtension(name: string, exts: string[]): boolean {
  const lower = name.toLowerCase();
  return exts.some((ext) => lower.endsWith(ext));
}

async function parsePlainText(file: File): Promise<string> {
  return (await file.text()).trim();
}

/** Returns concatenated text from every page of the PDF, separated by blank lines. */
async function parsePdf(file: File): Promise<string> {
  // Legacy build → ships ES2017 only and avoids modern ReadableStream async
  // iteration, which is unsupported by Tauri's WebKit on macOS / WebKitGTK on
  // Linux and was causing `undefined is not a function (near "value of
  // readableStream")` errors on the modern entry point.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const workerUrl = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  );
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.toString();

  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data,
    // Defensive: bypass any code path that would try to range-fetch or
    // stream — we already have the bytes in memory.
    disableStream: true,
    disableAutoFetch: true,
    isEvalSupported: false,
  }).promise;

  const pageTexts: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: unknown) => {
          const it = item as { str?: string; hasEOL?: boolean };
          return it.str ?? "";
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (pageText) pageTexts.push(pageText);
    }
  } finally {
    (doc as unknown as { cleanup?: () => void }).cleanup?.();
  }
  return pageTexts.join("\n\n").trim();
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return (result.value ?? "").trim();
}

/**
 * Tries to extract clean text from a CV file. Throws with a user-friendly
 * Spanish message when the format is unsupported or the file is empty.
 */
export async function parseCvFile(file: File): Promise<ParsedCv> {
  const name = file.name || "";
  const mime = file.type || "";

  if (mime.startsWith("text/") || hasExtension(name, TEXT_EXTENSIONS)) {
    const text = await parsePlainText(file);
    if (!text) throw new Error("El archivo está vacío.");
    return { text, kind: "text" };
  }

  if (mime === "application/pdf" || hasExtension(name, [".pdf"])) {
    const text = await parsePdf(file);
    if (!text) {
      throw new Error(
        "No se pudo extraer texto del PDF. Puede ser un PDF escaneado sin OCR; pega el texto manualmente.",
      );
    }
    return { text, kind: "pdf" };
  }

  if (mime === DOCX_MIME || hasExtension(name, [".docx"])) {
    const text = await parseDocx(file);
    if (!text) throw new Error("El DOCX no contiene texto extraíble.");
    return { text, kind: "docx" };
  }

  throw new Error(
    `Formato no soportado (${mime || name || "desconocido"}). Sube .txt, .md, .pdf o .docx, o pega el texto.`,
  );
}
