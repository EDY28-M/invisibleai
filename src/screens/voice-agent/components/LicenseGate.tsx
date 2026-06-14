import { useTranslation } from "@/hooks";
import { GetLicense } from "@/components/GetLicense";
import { MicIcon } from "lucide-react";

export function LicenseGate() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto gap-8 py-16 px-4">
      {/* Icon ring */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-violet-500/10 blur-2xl scale-150 pointer-events-none" />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xl shadow-lg">
          <MicIcon className="w-9 h-9 text-violet-400/60" strokeWidth={1.5} />
        </div>
      </div>

      {/* Copy */}
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-foreground">
          {t("voice_agent_license_required_title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          {t("voice_agent_license_required_desc")}
        </p>
      </div>

      {/* CTA */}
      <GetLicense />
    </div>
  );
}
