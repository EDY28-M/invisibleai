import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Textarea,
  Badge,
} from "@/components";
import { CV_MAX_CHARS } from "@/config/constants";
import { useInterviewCv, readCvFileAsText, useTranslation } from "@/hooks";
import * as Lucide from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

type CvUploadCardProps = {
  /** Whether the user has an active license. Controls the badge / trial banner shown. */
  hasActiveLicense: boolean;
  /** Free-tier one-shot trial flag — purely informational; the parent controls rendering. */
  trialUsed: boolean;
};

export function CvUploadCard({
  hasActiveLicense,
  trialUsed,
}: CvUploadCardProps) {
  const { t } = useTranslation();
  const { cv, save, clear } = useInterviewCv();
  const [draftText, setDraftText] = useState<string>(cv.text);
  const [draftFilename, setDraftFilename] = useState<string | null>(cv.filename);
  const [parseError, setParseError] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftText(cv.text);
    setDraftFilename(cv.filename);
  }, [cv.updatedAt, cv.text, cv.filename]);

  const dirty = draftText !== cv.text || draftFilename !== cv.filename;
  const draftLen = draftText.length;
  const draftTooLong = draftLen > CV_MAX_CHARS;

  const handleFile = async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    try {
      const text = await readCvFileAsText(file);
      setDraftText(text);
      setDraftFilename(file.name);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await handleFile(file);
  };

  const handleSave = () => {
    save({ text: draftText, filename: draftFilename });
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleClear = () => {
    clear();
    setDraftText("");
    setDraftFilename(null);
    setParseError(null);
  };

  return (
    <Card className="border border-border/40 bg-card/40 backdrop-blur-md shadow-sm">
      <CardHeader className="border-b border-border/20 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lucide.FileTextIcon className="size-5 text-primary" />
              {t("profiles_cv_title")}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {t("profiles_cv_desc")}
            </CardDescription>
          </div>
          {cv.updatedAt ? (
            <Badge variant="outline" className="text-[10px] uppercase font-bold whitespace-nowrap">
              <Lucide.CheckCircle2Icon className="mr-1 size-3 text-emerald-500" />
              {t("profiles_cv_loaded_at")} · {moment(cv.updatedAt).fromNow()}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] uppercase font-bold whitespace-nowrap">
              {t("profiles_cv_empty")}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {!hasActiveLicense && trialUsed && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
            <Lucide.InfoIcon className="size-4 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">
                {t("profiles_cv_trial_used_title")}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1 leading-relaxed">
                {t("profiles_cv_trial_used_desc")}
              </p>
            </div>
          </div>
        )}

        {!hasActiveLicense && !trialUsed && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
            <Lucide.SparklesIcon className="size-4 shrink-0 text-emerald-500 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">
                {t("profiles_cv_trial_title")}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1 leading-relaxed">
                {t("profiles_cv_trial_desc")}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isParsing}
            onClick={() => fileInputRef.current?.click()}
            className="border-border/40 bg-background/40 hover:bg-background/70"
          >
            {isParsing ? (
              <Lucide.Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <Lucide.UploadIcon className="mr-2 size-4" />
            )}
            {t("profiles_cv_upload_button")}
          </Button>
          {draftFilename && (
            <span className="text-xs text-muted-foreground/80 truncate max-w-[260px]">
              <Lucide.PaperclipIcon className="inline-block size-3 mr-1 -translate-y-px" />
              {draftFilename}
            </span>
          )}
          <span className="ml-auto text-[11px] text-muted-foreground/60">
            {t("profiles_cv_format_hint")}
          </span>
        </div>

        {parseError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <Lucide.AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        <Textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder={t("profiles_cv_paste_placeholder")}
          className={cn(
            "min-h-[240px] bg-background/50 border-border/40 text-sm leading-relaxed resize-y",
            "focus:border-primary focus:ring-1 focus:ring-primary/20",
          )}
        />

        <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
          <span
            className={cn(
              "tabular-nums",
              draftTooLong && "text-destructive font-semibold",
            )}
          >
            {draftLen.toLocaleString()} / {CV_MAX_CHARS.toLocaleString()} {t("profiles_cv_chars")} ({t("profiles_cv_chars_max")})
          </span>
          {dirty && !savedFeedback && (
            <span className="text-amber-500/80 font-semibold uppercase tracking-wider text-[10px]">
              <Lucide.CircleDotIcon className="inline-block size-3 mr-1 -translate-y-px" />
              unsaved
            </span>
          )}
          {savedFeedback && (
            <span className="text-emerald-500 font-semibold uppercase tracking-wider text-[10px]">
              <Lucide.CheckCircle2Icon className="inline-block size-3 mr-1 -translate-y-px" />
              saved
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t border-border/20 pt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!cv.text && !draftText}
          onClick={handleClear}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
        >
          <Lucide.Trash2Icon className="mr-2 size-4" />
          {t("profiles_cv_clear")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!dirty || draftTooLong}
          onClick={handleSave}
          className="bg-primary text-primary-foreground font-semibold"
        >
          <Lucide.SaveIcon className="mr-2 size-4" />
          {t("profiles_cv_save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
