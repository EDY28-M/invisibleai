import { CursorSelection, ShortcutManager } from "./components";
import { PageLayout } from "@/layouts";
import { useTranslation } from "@/hooks";

const Shortcuts = () => {
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("shortcuts_title")}
      description={t("shortcuts_desc")}
    >
      <div className="flex flex-col gap-5 w-full max-w-5xl mx-auto p-1">

        {/* Cursor selection */}
        <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-violet-500/8 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <CursorSelection />
          </div>
        </div>

        {/* Shortcut manager */}
        <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <ShortcutManager />
          </div>
        </div>

      </div>
    </PageLayout>
  );
};

export default Shortcuts;
