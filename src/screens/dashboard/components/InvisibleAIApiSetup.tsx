import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2Icon,
  ChevronDown,
  KeyIcon,
  LoaderIcon,
  TrashIcon,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "@/contexts";
import { useTranslation } from "@/hooks";

import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
} from "@/components";

interface ActivationResponse {
  activated: boolean;
  error?: string;
  license_key?: string;
  instance?: { id: string; name: string; created_at: string };
  is_dev_license?: boolean;
}

interface StorageResult {
  license_key?: string;
  instance_id?: string;
  selected_invisibleai_model?: string;
}

interface Model {
  provider: string;
  name: string;
  id: string;
  model: string;
  description: string;
  modality: string;
  isAvailable: boolean;
}

const LICENSE_KEY_STORAGE_KEY = "invisibleai_license_key";
const INSTANCE_ID_STORAGE_KEY = "invisibleai_instance_id";
const SELECTED_INVISIBLEAI_MODEL_STORAGE_KEY = "selected_invisibleai_model";

export const InvisibleAIApiSetup = () => {
  const {
    invisibleaiApiEnabled,
    setInvisibleAIApiEnabled,
    hasActiveLicense,
    setHasActiveLicense,
    getActiveLicenseStatus,
    setSupportsImages,
  } = useApp();

  const { t, language } = useTranslation();

  const [licenseKey, setLicenseKey] = useState("");
  const [storedLicenseKey, setStoredLicenseKey] = useState<string | null>(null);
  const [maskedLicenseKey, setMaskedLicenseKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const fetchInitiated = useRef(false);
  const commandListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLicenseStatus();
    if (!fetchInitiated.current) {
      fetchInitiated.current = true;
      fetchModels();
    }
  }, []);

  useEffect(() => {
    if (commandListRef.current) commandListRef.current.scrollTop = 0;
  }, [searchValue]);

  const fetchModels = async () => {
    setIsModelsLoading(true);
    try {
      const fetchedModels = await invoke<Model[]>("fetch_models");
      setModels(fetchedModels);
    } catch (error) {
      console.error("Failed to fetch models:", error);
    } finally {
      setIsModelsLoading(false);
    }
  };

  const loadLicenseStatus = async () => {
    try {
      const storage = await invoke<StorageResult>("secure_storage_get");
      if (storage.license_key) {
        setStoredLicenseKey(storage.license_key);
        const masked = await invoke<string>("mask_license_key_cmd", { licenseKey: storage.license_key });
        setMaskedLicenseKey(masked);
      } else {
        setStoredLicenseKey(null);
        setMaskedLicenseKey(null);
      }
      if (storage.selected_invisibleai_model) {
        try { setSelectedModel(JSON.parse(storage.selected_invisibleai_model)); }
        catch { setSelectedModel(null); }
      } else {
        setSelectedModel(null);
      }
    } catch (error) {
      console.error("Failed to load license status:", error);
      setStoredLicenseKey(null);
      setMaskedLicenseKey(null);
      setSelectedModel(null);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) { setError("Please enter a license key"); return; }
    setIsLoading(true); setError(null); setSuccess(null);
    try {
      const response: ActivationResponse = await invoke("activate_license_api", { licenseKey: licenseKey.trim() });
      if (response.activated && response.instance) {
        await invoke("secure_storage_save", {
          items: [
            { key: LICENSE_KEY_STORAGE_KEY, value: licenseKey.trim() },
            { key: INSTANCE_ID_STORAGE_KEY, value: response.instance.id },
          ],
        });
        setSuccess("License activated successfully!");
        setLicenseKey("");
        if (!response?.is_dev_license) setInvisibleAIApiEnabled(true);
        await loadLicenseStatus();
        await fetchModels();
        await getActiveLicenseStatus();
      } else {
        setError(response.error || "Failed to activate license");
      }
    } catch (error) {
      setError(typeof error === "string" ? error : "Failed to activate license");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLicense = async () => {
    setIsLoading(true); setError(null); setSuccess(null);
    setHasActiveLicense(false);
    try {
      await invoke("secure_storage_remove", {
        keys: [LICENSE_KEY_STORAGE_KEY, INSTANCE_ID_STORAGE_KEY, SELECTED_INVISIBLEAI_MODEL_STORAGE_KEY],
      });
      setSuccess("License removed successfully!");
      setInvisibleAIApiEnabled(false);
      await fetchModels();
      await loadLicenseStatus();
    } catch (error) {
      setError("Failed to remove license");
    } finally {
      setIsLoading(false);
      await invoke("deactivate_license_api");
    }
  };

  const handleModelSelect = async (model: Model) => {
    setSelectedModel(model);
    setIsPopoverOpen(false);
    setSearchValue("");
    if (invisibleaiApiEnabled) setSupportsImages(model.modality?.includes("image") ?? false);
    try {
      await invoke("secure_storage_save", {
        items: [{ key: SELECTED_INVISIBLEAI_MODEL_STORAGE_KEY, value: JSON.stringify(model) }],
      });
    } catch (error) {
      setError("Failed to save model selection.");
    }
  };

  const handlePopoverOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);
    if (open) setSearchValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !storedLicenseKey) handleActivateLicense();
  };

  return (
    <div className="space-y-5 w-full max-w-5xl mx-auto p-1">

      <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-destructive/6 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div>
            <h2 className="text-[15px] font-bold text-foreground/95 tracking-wide">
              {language === "spanish" ? "Licencia y Modelos" : "License & Models"}
            </h2>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {language === "spanish"
                ? "Conecta tu licencia y selecciona el modelo inteligente del panel."
                : "Connect your license and select the intelligence model for the panel."}
            </p>
          </div>

          <Popover modal={true} open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild disabled={isModelsLoading} className="flex cursor-pointer justify-start">
              <Button
                variant="outline"
                className="h-11 w-full justify-between rounded-2xl border border-border/25 bg-card/30 px-4 text-left hover:bg-card/50 transition-colors"
              >
                <span className="min-w-0 truncate text-sm">
                  {selectedModel
                    ? selectedModel.name
                    : isModelsLoading
                    ? (language === "spanish" ? "Cargando modelos..." : "Loading models...")
                    : t("api_setup_select_pro")}
                </span>
                <span className="ml-3 flex shrink-0 items-center gap-2">
                  {selectedModel && (
                    <>
                      <Badge variant="outline">{selectedModel.provider}</Badge>
                      <Badge variant="secondary">{selectedModel.modality}</Badge>
                    </>
                  )}
                  <ChevronDown className="size-4 text-muted-foreground/50" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" side="bottom" className="w-[600px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl p-0">
              <Command shouldFilter={true}>
                <CommandInput
                  placeholder={language === "spanish" ? "Buscar modelo..." : "Search model..."}
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList ref={commandListRef} className="max-h-[340px] overflow-y-auto">
                  <CommandEmpty>
                    {language === "spanish" ? "No se encontraron modelos." : "No models found."}
                  </CommandEmpty>
                  <CommandGroup className="p-2">
                    {models.map((model, index) => (
                      <CommandItem
                        disabled={!model?.isAvailable}
                        key={`${model?.id}-${index}`}
                        className="cursor-pointer rounded-xl px-3 py-3"
                        onSelect={() => handleModelSelect(model)}
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{model.name}</p>
                            <Badge variant="outline">{model.modality}</Badge>
                            <Badge variant="secondary">
                              {model.isAvailable
                                ? model.provider
                                : (language === "spanish" ? "No disponible" : "Not available")}
                            </Badge>
                            {selectedModel?.id === model.id && (
                              <CheckCircle2Icon className="ml-auto size-4 text-primary" />
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={model.description}>
                            {model.description}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-zinc-500/20 bg-zinc-500/5 px-4 py-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{success}</p>
            </div>
          )}

          {!storedLicenseKey ? (
            <div className="flex flex-col items-stretch gap-3 sm:flex-row">
              <Input
                type="password"
                placeholder={t("api_setup_license_key_placeholder")}
                value={licenseKey}
                onChange={(event) => { setLicenseKey(event.target.value); setError(null); setSuccess(null); }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="h-11 flex-1 rounded-2xl border border-border/25 bg-card/20 px-4 text-sm"
              />
              <Button
                onClick={handleActivateLicense}
                disabled={isLoading || !licenseKey.trim()}
                className="h-11 rounded-2xl px-6 font-bold text-xs transition-all duration-200 active:scale-95"
              >
                {isLoading ? <LoaderIcon className="size-3.5 animate-spin mr-1.5" /> : <KeyIcon className="size-3.5 mr-1.5" />}
                {language === "spanish" ? "Activar" : "Activate"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-stretch gap-3 sm:flex-row">
              <Input
                type="text"
                value={maskedLicenseKey || ""}
                disabled={true}
                className="h-11 flex-1 rounded-2xl border border-border/20 bg-card/10 px-4 text-sm text-muted-foreground/60"
              />
              <Button
                onClick={handleRemoveLicense}
                disabled={isLoading}
                variant="outline"
                className="h-11 rounded-2xl px-6 font-bold text-xs transition-all duration-200 active:scale-95"
              >
                {isLoading ? <LoaderIcon className="size-3.5 animate-spin mr-1.5" /> : <TrashIcon className="size-3.5 mr-1.5" />}
                {t("api_setup_remove")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-blue-500/8 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h2 className="text-[15px] font-bold text-foreground/95 tracking-wide">
              {language === "spanish" ? "Estado del Sistema" : "System Status"}
            </h2>
            <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-sm">
              {hasActiveLicense
                ? (language === "spanish" ? "Tienes acceso completo a todas las funciones premium activas." : "Full access to all active premium core features.")
                : (language === "spanish" ? "Activa tu licencia para desbloquear el máximo rendimiento." : "Activate your license to unlock maximum performance.")}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-3">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
              hasActiveLicense
                ? "border-zinc-500/20 bg-zinc-500/10 text-zinc-500"
                : "border-border/20 bg-muted/30 text-muted-foreground/60"
            }`}>
              <span className={`mr-1.5 size-1.5 rounded-full ${hasActiveLicense ? "bg-zinc-500 animate-pulse" : "bg-muted-foreground/40"}`} />
              {hasActiveLicense ? t("active") : t("inactive")}
            </span>
            <label className="flex items-center gap-2.5 text-xs font-bold text-foreground/70 cursor-pointer">
              {invisibleaiApiEnabled ? t("api_setup_disable_api") : t("api_setup_enable_api")}
              <Switch
                checked={invisibleaiApiEnabled}
                onCheckedChange={setInvisibleAIApiEnabled}
                disabled={!storedLicenseKey || !hasActiveLicense}
              />
            </label>
          </div>
        </div>
      </div>

    </div>
  );
};
