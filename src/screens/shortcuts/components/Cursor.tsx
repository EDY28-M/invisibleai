import { useApp } from "@/contexts";
import { getPlatform } from "@/lib";
import { CursorType } from "@/lib/storage";
import { MousePointer, Pointer, EyeOffIcon } from "lucide-react";
import { useTranslation } from "@/hooks";

interface CursorSelectionProps {
  className?: string;
}

export const CursorSelection = ({ className }: CursorSelectionProps) => {
  const { customizable, setCursorType } = useApp();
  const platform = getPlatform();
  const { t } = useTranslation();

  const activeCursor = customizable.cursor.type;

  const cursorDetails = {
    invisible: {
      title: t("shortcuts_cursor_invisible"),
      desc: "Oculta el puntero de tu cursor de forma permanente para una visualización y capturas totalmente limpias.",
      icon: <EyeOffIcon className="size-5" />,
      orb: "bg-indigo-500/20 blur-2xl",
    },
    default: {
      title: t("shortcuts_cursor_default"),
      desc: "Utiliza el cursor nativo de tu sistema operativo con la aceleración y tamaño predeterminados.",
      icon: <MousePointer className="size-5" />,
      orb: "bg-violet-500/20 blur-2xl",
    },
    auto: {
      title: t("shortcuts_cursor_auto"),
      desc: "Adapta la visualización del puntero automáticamente de acuerdo con el contexto o tipo de control enfocado.",
      icon: <Pointer className="size-5" />,
      orb: "bg-blue-500/20 blur-2xl",
    },
  };

  const handleSelectCursor = (type: CursorType) => {
    if (type === "invisible" && platform === "linux") return;
    setCursorType(type);
  };

  return (
    <div id="cursor" className={`space-y-4 w-full max-w-5xl mx-auto p-1 ${className}`}>
      <div className="mb-1">
        <h3 className="text-[15px] font-bold text-foreground/95 tracking-wide">
          {t("shortcuts_cursor_title")}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {t("shortcuts_cursor_desc")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["invisible", "default", "auto"] as CursorType[]).map((type) => {
          const detail = cursorDetails[type];
          const isActive = activeCursor === type;
          const isDisabled = type === "invisible" && platform === "linux";

          return (
            <div
              key={type}
              onClick={() => handleSelectCursor(type)}
              className={`group relative rounded-2xl border p-5 transition-all duration-300 flex flex-col justify-between min-h-[150px] overflow-hidden ${
                isDisabled
                  ? "opacity-40 cursor-not-allowed border-border/15 bg-card/10"
                  : isActive
                  ? "border-border/30 bg-card/60 cursor-pointer shadow-sm"
                  : "border-border/15 bg-card/20 text-muted-foreground hover:border-border/30 hover:bg-card/40 cursor-pointer"
              }`}
            >
              {isActive && (
                <div
                  className={`absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none ${detail.orb}`}
                />
              )}

              <div className="relative z-10 flex items-start justify-between">
                <div className={`p-2 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-foreground/8 text-foreground/70"
                    : "bg-muted/50 text-muted-foreground/50 group-hover:bg-muted/70"
                }`}>
                  {detail.icon}
                </div>

                {isDisabled ? (
                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                    {t("shortcuts_cursor_linux_not_supported")}
                  </span>
                ) : (
                  isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" />
                  )
                )}
              </div>

              <div className="relative z-10 mt-4">
                <h4 className={`text-[13px] font-bold uppercase tracking-wider ${
                  isActive ? "text-foreground/90" : "text-foreground/50"
                }`}>
                  {detail.title}
                </h4>
                <p className={`text-xs mt-1.5 leading-relaxed ${
                  isActive ? "text-muted-foreground/70" : "text-muted-foreground/45"
                }`}>
                  {detail.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
