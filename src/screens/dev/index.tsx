import { useState } from "react";
import { AIProviders, STTProviders } from "./components";
import { useSettings, useTranslation } from "@/hooks";
import { useApp } from "@/contexts";
import { PageLayout } from "@/layouts";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  GetLicense,
} from "@/components";
import { LockKeyholeIcon } from "lucide-react";

const cardClass =
  "relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden";

type LockedSection = "ai" | "stt";

const LockedByServerBanner = ({
  hasActiveLicense,
  onRequestDisable,
}: {
  hasActiveLicense: boolean;
  onRequestDisable: () => void;
}) => {
  const { t } = useTranslation();
  const title = hasActiveLicense
    ? t("dev_locked_licensed_title")
    : t("dev_locked_free_title");
  const desc = hasActiveLicense
    ? t("dev_locked_licensed_desc")
    : t("dev_locked_free_desc");
  const cta = hasActiveLicense
    ? t("dev_locked_disable_now")
    : t("dev_locked_need_license_cta");

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex items-start gap-3 w-full rounded-2xl bg-indigo-500/8 border border-indigo-500/15 p-4">
        <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center">
          <LockKeyholeIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 leading-snug">
            {title}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {desc}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRequestDisable}
        className="text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 underline underline-offset-2 transition-colors cursor-pointer"
      >
        {cta}
      </button>
    </div>
  );
};

const LicenseRequiredDialog = ({
  open,
  onOpenChange,
  section,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: LockedSection;
}) => {
  const { t } = useTranslation();
  const description =
    section === "ai"
      ? t("dev_license_required_ai_desc")
      : t("dev_license_required_stt_desc");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500/15 flex items-center justify-center">
              <LockKeyholeIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
            <DialogTitle>{t("dev_license_required_title")}</DialogTitle>
          </div>
          <DialogDescription className="pt-2 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              {t("dev_license_required_close")}
            </Button>
          </DialogClose>
          <GetLicense
            setState={(next) => onOpenChange(typeof next === "boolean" ? next : false)}
            buttonText={t("dev_license_required_action")}
            buttonClassName="bg-indigo-500 hover:bg-indigo-500/90 text-white"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DevSpace = () => {
  const settings = useSettings();
  const { t } = useTranslation();
  const { invisibleaiApiEnabled, setInvisibleAIApiEnabled, hasActiveLicense } = useApp();
  const [licenseDialogSection, setLicenseDialogSection] =
    useState<LockedSection | null>(null);

  const requestDisable = (section: LockedSection) => {
    if (hasActiveLicense) {
      setInvisibleAIApiEnabled(false);
      return;
    }
    setLicenseDialogSection(section);
  };

  return (
    <PageLayout title={t("dev_title")} description={t("dev_desc")}>
      <div id="dev" className="space-y-5 w-full max-w-5xl mx-auto p-1">

        <div className={cardClass}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-indigo-500/8 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            {invisibleaiApiEnabled ? (
              <>
                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground/90">
                    {t("dev_ai_title")}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {t("dev_ai_desc")}
                  </p>
                </div>
                <LockedByServerBanner
                  hasActiveLicense={hasActiveLicense}
                  onRequestDisable={() => requestDisable("ai")}
                />
              </>
            ) : (
              <AIProviders {...settings} />
            )}
          </div>
        </div>

        <div className={cardClass}>
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-sky-500/8 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            {invisibleaiApiEnabled ? (
              <>
                <div className="mb-4">
                  <p className="text-sm font-semibold text-foreground/90">
                    {t("dev_stt_title")}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {t("dev_stt_desc")}
                  </p>
                </div>
                <LockedByServerBanner
                  hasActiveLicense={hasActiveLicense}
                  onRequestDisable={() => requestDisable("stt")}
                />
              </>
            ) : (
              <STTProviders {...settings} />
            )}
          </div>
        </div>

      </div>

      <LicenseRequiredDialog
        open={licenseDialogSection !== null}
        onOpenChange={(open) => {
          if (!open) setLicenseDialogSection(null);
        }}
        section={licenseDialogSection ?? "ai"}
      />
    </PageLayout>
  );
};

export default DevSpace;
