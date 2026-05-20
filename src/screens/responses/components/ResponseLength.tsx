import { RESPONSE_LENGTHS } from "@/lib";
import { useApp } from "@/contexts";
import { updateResponseLength } from "@/lib/storage/response-settings.storage";
import { useState, useEffect } from "react";
import { getResponseSettings } from "@/lib";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/hooks";

export const ResponseLength = () => {
  const { hasActiveLicense } = useApp();
  const [selectedLength, setSelectedLength] = useState<string>("auto");
  const { t } = useTranslation();

  useEffect(() => {
    const settings = getResponseSettings();
    setSelectedLength(settings.responseLength);
  }, []);

  const handleLengthChange = (lengthId: string) => {
    if (!hasActiveLicense) return;
    setSelectedLength(lengthId);
    updateResponseLength(lengthId);
  };

  const getLengthTitle = (id: string) => {
    switch (id) {
      case "short":  return t("responses_len_short_title");
      case "medium": return t("responses_len_medium_title");
      case "auto":   return t("responses_len_auto_title");
      default:       return id;
    }
  };

  const getLengthDesc = (id: string) => {
    switch (id) {
      case "short":  return t("responses_len_short_desc");
      case "medium": return t("responses_len_medium_desc");
      case "auto":   return t("responses_len_auto_desc");
      default:       return "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground/95 tracking-wide">
          {t("responses_len_title")}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {t("responses_len_desc")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {RESPONSE_LENGTHS.map((length) => (
          <button
            key={length.id}
            onClick={() => handleLengthChange(length.id)}
            disabled={!hasActiveLicense}
            className={`relative text-left rounded-2xl border p-4 transition-all duration-200 group overflow-hidden ${
              selectedLength === length.id
                ? "border-foreground/20 bg-card/60 shadow-sm"
                : "border-border/20 bg-card/20 hover:bg-card/35 hover:border-border/35"
            } ${!hasActiveLicense ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="space-y-1.5">
              <p className="text-[15px] font-semibold text-foreground/90">
                {getLengthTitle(length.id)}
              </p>
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                {getLengthDesc(length.id)}
              </p>
            </div>
            {selectedLength === length.id && (
              <CheckCircle2 className="size-3.5 text-foreground/40 absolute top-3 right-3" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
