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
      <div className="flex flex-col gap-6 pb-8">
        <section className="rounded-xl bg-card p-6 shadow-sm shadow-black/5">
          <CursorSelection />
        </section>

        <section className="rounded-xl bg-card p-6 shadow-sm shadow-black/5">
          <ShortcutManager />
        </section>
      </div>
    </PageLayout>
  );
};

export default Shortcuts;
