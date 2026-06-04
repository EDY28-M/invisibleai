import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Header,
  Selection,
  Textarea,
  TextInput,
} from "@/components";
import { useCustomSttProviders, useTranslation } from "@/hooks";
import { cn } from "@/lib/utils";
import { UseSettingsReturn } from "@/types";
import curl2Json from "@bany/curl-to-json";
import { EditIcon, PlusIcon, SaveIcon, TrashIcon } from "lucide-react";

const getProviderLabel = (curl: string) => {
  try {
    return curl2Json(curl)?.url || "Custom STT provider";
  } catch {
    return "Invalid curl command";
  }
};

const sttCurlPlaceholder = `curl -X POST "https://api.openai.com/v1/audio/transcriptions" \\
  -H "Authorization: Bearer {{API_KEY}}" \\
  -F "file={{AUDIO}}" \\
  -F "model={{MODEL}}"`;

export const CustomProviders = ({ allSttProviders }: UseSettingsReturn) => {
  const { t } = useTranslation();
  const customProviderHook = useCustomSttProviders();
  const {
    handleEdit,
    handleDelete,
    deleteConfirm,
    confirmDelete,
    cancelDelete,
    showForm,
    setShowForm,
    editingProvider,
    formData,
    setFormData,
    errors,
    handleSave,
    handleAutoFill,
    resetForm,
  } = customProviderHook;

  const customProviders = allSttProviders.filter((provider) => provider.isCustom);
  const baseProviders = allSttProviders.filter((provider) => !provider.isCustom);

  return (
    <section className="mt-6 rounded-2xl border border-border/40 bg-card/25 backdrop-blur-md p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <Header
          title={t("dev_advanced_title")}
          description={t("dev_advanced_stt_desc")}
        />
        <Button
          variant="outline"
          className="h-9 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all shrink-0"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <PlusIcon className="size-4" />
          {t("dev_custom_create")}
        </Button>
      </div>

      <div className="space-y-2">
        {customProviders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/30 px-3 py-4 text-xs text-muted-foreground/60 italic">
            {t("dev_custom_empty")}
          </p>
        ) : (
          customProviders.map((provider) => (
            <Card
              key={provider.id}
              className="gap-0 rounded-xl border border-border/45 bg-card/10 backdrop-blur-sm p-3 shadow-sm hover:bg-card/20 transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium">
                    {getProviderLabel(provider.curl)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/75">
                    {provider.responseContentPath || t("dev_custom_no_path")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-lg"
                    onClick={() => provider.id && handleEdit(provider.id)}
                    title={t("edit")}
                  >
                    <EditIcon className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => provider.id && handleDelete(provider.id)}
                    title={t("delete")}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? t("dev_custom_edit") : t("dev_custom_create")}
            </DialogTitle>
            <DialogDescription>{t("dev_custom_stt_dialog_desc")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="w-full sm:w-44">
              <Selection
                options={baseProviders.map((provider) => ({
                  label: provider.name || provider.id || t("dev_provider_fallback"),
                  value: provider.id || "",
                }))}
                placeholder={t("dev_autofill")}
                onChange={handleAutoFill}
              />
            </div>

            <div className="space-y-2">
              <Header
                title={t("dev_custom_curl")}
                description={t("dev_custom_stt_curl_desc")}
              />
              <Textarea
                className={cn(
                  "h-64 font-mono text-xs",
                  errors.curl && "border-red-500"
                )}
                placeholder={sttCurlPlaceholder}
                value={formData.curl}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, curl: event.target.value }))
                }
              />
              {errors.curl && <p className="text-xs text-red-500">{errors.curl}</p>}
            </div>

            <TextInput
              placeholder="text"
              value={formData.responseContentPath || ""}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  responseContentPath: value,
                }))
              }
              error={errors.responseContentPath}
              notes={t("dev_custom_response_path")}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} className="h-9 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all">
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!formData.curl.trim()} className="h-9 rounded-xl gap-1.5 transition-all">
              <SaveIcon className="size-4" />
              {editingProvider ? t("edit") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={cancelDelete}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("dev_custom_delete_title")}</DialogTitle>
            <DialogDescription>{t("dev_custom_delete_desc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
