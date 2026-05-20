import {
  ResponseLength,
  LanguageSelector,
  AutoScrollToggle,
  ConversationalMemoryToggle,
} from "./components";
import { PageLayout } from "@/layouts";
import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";

const Responses = () => {
  const { hasActiveLicense } = useApp();
  const { t } = useTranslation();
  const premiumTitle = t("responses_premium_title")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();

  return (
    <PageLayout
      title={t("responses_title")}
      description={t("responses_desc")}
    >
      {!hasActiveLicense && (
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            {premiumTitle}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {t("responses_premium_desc")}
          </p>
        </div>
      )}

      <section className="rounded-xl bg-card p-6 shadow-sm shadow-black/5">
        <ResponseLength />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-sm shadow-black/5">
          <LanguageSelector />
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm shadow-black/5">
          <AutoScrollToggle />
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 shadow-sm shadow-black/5">
        <ConversationalMemoryToggle />
      </section>
    </PageLayout>
  );
};

export default Responses;
