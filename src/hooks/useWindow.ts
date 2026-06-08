import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useEffect } from "react";

const COLLAPSED_HEIGHT = 54;
const EXPANDED_HEIGHT = 600;
const COLLAPSE_DEBOUNCE_MS = 150;

const isAnyPopoverOpen = (): boolean => {
  const popoverContents = document.querySelectorAll(
    "[data-radix-popper-content-wrapper]"
  );
  return popoverContents.length > 0;
};

// --- Estado singleton compartido por TODAS las instancias de useWindowResize() ---
// Antes, cada componente que llamaba al hook (DragButton, updater, useCompletion,
// useSystemAudio = 4 instancias) montaba su PROPIO MutationObserver sobre todo el
// body + sus propios listeners de mouse, y cada cambio disparaba un IPC de resize
// aunque la altura ya fuera la correcta. Durante el streaming el DOM muta en cada
// token, así que esos 4 observadores saturaban la ventana con IPC redundante.
// Ahora hay un único observador (con conteo de referencias), el resize está
// debounced, y se omite el IPC si la altura no cambió.
let lastRequestedHeight: number | null = null;

const applyWindowHeight = async (expanded: boolean): Promise<void> => {
  try {
    if (!expanded && isAnyPopoverOpen()) {
      return;
    }

    const newHeight = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;

    // No-op si la ventana ya tiene esa altura → evita IPC + relayout innecesarios.
    if (newHeight === lastRequestedHeight) {
      return;
    }
    lastRequestedHeight = newHeight;

    const window = getCurrentWebviewWindow();
    await invoke("set_window_height", {
      window,
      height: newHeight,
    });
  } catch (error) {
    // Si el IPC falla, invalida el cache para reintentar en el próximo cambio.
    lastRequestedHeight = null;
    console.error("Failed to resize window:", error);
  }
};

let observerRefCount = 0;
let mutationObserver: MutationObserver | null = null;
let collapseTimer: ReturnType<typeof setTimeout> | null = null;
let isDragging = false;

const scheduleCollapse = (): void => {
  if (collapseTimer) clearTimeout(collapseTimer);
  collapseTimer = setTimeout(() => {
    collapseTimer = null;
    if (!isAnyPopoverOpen()) {
      void applyWindowHeight(false);
    }
  }, COLLAPSE_DEBOUNCE_MS);
};

const handleMouseDown = (e: MouseEvent): void => {
  const target = e.target as HTMLElement;
  if (target.closest('[data-tauri-drag-region="true"]')) {
    isDragging = true;
  }
};

const handleMouseUp = (): void => {
  if (isDragging) {
    isDragging = false;
    scheduleCollapse();
  }
};

const acquireWindowObserver = (): void => {
  observerRefCount += 1;
  if (observerRefCount > 1) return; // ya inicializado por otra instancia

  mutationObserver = new MutationObserver(scheduleCollapse);
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-state"],
  });
  document.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mouseup", handleMouseUp);
};

const releaseWindowObserver = (): void => {
  observerRefCount -= 1;
  if (observerRefCount > 0) return; // todavía hay instancias activas
  observerRefCount = 0;

  if (collapseTimer) {
    clearTimeout(collapseTimer);
    collapseTimer = null;
  }
  mutationObserver?.disconnect();
  mutationObserver = null;
  isDragging = false;
  document.removeEventListener("mousedown", handleMouseDown);
  document.removeEventListener("mouseup", handleMouseUp);
};

export const useWindowResize = () => {
  const resizeWindow = useCallback((expanded: boolean): Promise<void> => {
    return applyWindowHeight(expanded);
  }, []);

  useEffect(() => {
    acquireWindowObserver();
    return () => {
      releaseWindowObserver();
    };
  }, []);

  return { resizeWindow };
};

interface UseWindowFocusOptions {
  onFocusLost?: () => void;
  onFocusGained?: () => void;
}

export const useWindowFocus = ({
  onFocusLost,
  onFocusGained,
}: UseWindowFocusOptions = {}) => {
  const handleFocusChange = useCallback(
    async (focused: boolean) => {
      if (focused && onFocusGained) {
        onFocusGained();
      } else if (!focused && onFocusLost) {
        onFocusLost();
      }
    },
    [onFocusLost, onFocusGained]
  );

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupFocusListener = async () => {
      try {
        const window = getCurrentWebviewWindow();

        unlisten = await window.onFocusChanged(({ payload: focused }) => {
          handleFocusChange(focused);
        });
      } catch (error) {
        console.error("Failed to setup focus listener:", error);
      }
    };

    setupFocusListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [handleFocusChange]);
};
