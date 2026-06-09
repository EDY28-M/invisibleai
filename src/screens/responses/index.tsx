import {
  ResponseLength,
  LanguageSelector,
  AutoScrollToggle,
  ConversationalMemoryToggle,
} from "./components";
import { PageLayout } from "@/layouts";
import { useTranslation } from "@/hooks";

const Responses = () => {
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("responses_title")}
      description={t("responses_desc")}
    >
      <div id="responses" className="space-y-5 w-full max-w-5xl mx-auto p-1">

        <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-blue-500/6 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <ResponseLength />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-violet-500/8 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <LanguageSelector />
            </div>
          </div>
          <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
            <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-cyan-500/8 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <AutoScrollToggle />
            </div>
          </div>
        </div>

        <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
          <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-zinc-500/8 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <ConversationalMemoryToggle />
          </div>
        </div>

      </div>
    </PageLayout>
  );
};

export default Responses;
