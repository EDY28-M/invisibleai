import { useEffect, useRef } from "react";
import { MousePointer2 } from "lucide-react";

export const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const isVisibleRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Apply the latest position exactly once per animation frame. The frame is
    // scheduled only in response to movement, so the cursor costs zero CPU while
    // the mouse is idle (the previous implementation ran a 60fps loop forever).
    const renderFrame = () => {
      frameRef.current = null;
      if (cursorRef.current && isVisibleRef.current) {
        const { x, y } = positionRef.current;
        cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    const scheduleFrame = () => {
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(renderFrame);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      positionRef.current = { x: e.clientX, y: e.clientY };

      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        if (cursorRef.current) {
          cursorRef.current.style.opacity = "1";
        }
      }

      scheduleFrame();
    };

    const hideCursor = () => {
      isVisibleRef.current = false;
      if (cursorRef.current) {
        cursorRef.current.style.opacity = "0";
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", hideCursor);
    window.addEventListener("blur", hideCursor);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", hideCursor);
      window.removeEventListener("blur", hideCursor);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999] opacity-0 will-change-transform"
      style={{
        transform: "translate3d(0px, 0px, 0)",
        transition: "opacity 0.1s ease-out",
      }}
    >
      <MousePointer2 className="w-5 h-5 drop-shadow-2xl fill-secondary stroke-primary" />
    </div>
  );
};
