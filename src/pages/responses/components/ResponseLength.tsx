import { Card, Header } from "@/components";
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
    if (!hasActiveLicense) {
      return;
    }
    setSelectedLength(lengthId);
    updateResponseLength(lengthId);
  };

  const getLengthTitle = (id: string) => {
    switch (id) {
      case "short":
        return t("responses_len_short_title");
      case "medium":
        return t("responses_len_medium_title");
      case "auto":
        return t("responses_len_auto_title");
      default:
        return id;
    }
  };

  const getLengthDesc = (id: string) => {
    switch (id) {
      case "short":
        return t("responses_len_short_desc");
      case "medium":
        return t("responses_len_medium_desc");
      case "auto":
        return t("responses_len_auto_desc");
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      <Header
        title={t("responses_len_title")}
        description={t("responses_len_desc")}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {RESPONSE_LENGTHS.map((length) => (
          <Card
            key={length.id}
            className={`relative p-4 border lg:border-2 shadow-none cursor-pointer transition-all ${
              selectedLength === length.id
                ? "border-primary"
                : "border-border hover:border-primary/50"
            } ${!hasActiveLicense ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => handleLengthChange(length.id)}
          >
            <div className="space-y-1">
              <h3 className="text-sm lg:text-md font-semibold">
                {getLengthTitle(length.id)}
              </h3>
              <p className="text-[10px] lg:text-xs text-muted-foreground">
                {getLengthDesc(length.id)}
              </p>
            </div>
            {selectedLength === length.id && (
              <CheckCircle2 className="size-5 text-green-500 flex-shrink-0 absolute top-2 right-2" />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
