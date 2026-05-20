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
  instance?: {
    id: string;
    name: string;
    created_at: string;
  };
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
    if (commandListRef.current) {
      commandListRef.current.scrollTop = 0;
    }
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
        const masked = await invoke<string>("mask_license_key_cmd", {
          licenseKey: storage.license_key,
        });
        setMaskedLicenseKey(masked);
      } else {
        setStoredLicenseKey(null);
        setMaskedLicenseKey(null);
      }

      if (storage.selected_invisibleai_model) {
        try {
          setSelectedModel(JSON.parse(storage.selected_invisibleai_model));
        } catch (error) {
          console.error("Failed to parse stored model:", error);
          setSelectedModel(null);
        }
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
    if (!licenseKey.trim()) {
      setError("Please enter a license key");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response: ActivationResponse = await invoke(
        "activate_license_api",
        {
          licenseKey: licenseKey.trim(),
        }
      );

      if (response.activated && response.instance) {
        await invoke("secure_storage_save", {
          items: [
            {
              key: LICENSE_KEY_STORAGE_KEY,
              value: licenseKey.trim(),
            },
            {
              key: INSTANCE_ID_STORAGE_KEY,
              value: response.instance.id,
            },
          ],
        });

        setSuccess("License activated successfully!");
        setLicenseKey("");

        if (!response?.is_dev_license) {
          setInvisibleAIApiEnabled(true);
        }

        await loadLicenseStatus();
        await fetchModels();
        await getActiveLicenseStatus();
      } else {
        setError(response.error || "Failed to activate license");
      }
    } catch (error) {
      console.error("License activation failed:", error);
      setError(
        typeof error === "string" ? error : "Failed to activate license"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLicense = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setHasActiveLicense(false);

    try {
      await invoke("secure_storage_remove", {
        keys: [
          LICENSE_KEY_STORAGE_KEY,
          INSTANCE_ID_STORAGE_KEY,
          SELECTED_INVISIBLEAI_MODEL_STORAGE_KEY,
        ],
      });

      setSuccess("License removed successfully!");
      setInvisibleAIApiEnabled(false);
      await fetchModels();
      await loadLicenseStatus();
    } catch (error) {
      console.error("Failed to remove license:", error);
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

    if (invisibleaiApiEnabled) {
      setSupportsImages(model.modality?.includes("image") ?? false);
    }

    try {
      await invoke("secure_storage_save", {
        items: [
          {
            key: SELECTED_INVISIBLEAI_MODEL_STORAGE_KEY,
            value: JSON.stringify(model),
          },
        ],
      });
    } catch (error) {
      console.error("Failed to save model selection:", error);
      setError("Failed to save model selection.");
    }
  };

  const handlePopoverOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);
    if (open) {
      setSearchValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !storedLicenseKey) {
      handleActivateLicense();
    }
  };

  return (
    <>
      <section
        id="invisibleai-api"
        className="rounded-xl bg-card p-8 shadow-sm shadow-black/5"
      >
        <h2 className="mb-1 text-lg font-semibold text-primary">API Key</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {language === "spanish"
            ? "Conecta InvisibleAI con tu licencia y selecciona el modelo que usara el panel."
            : "Connect InvisibleAI with your license and select the model used by the panel."}
        </p>

        <div className="mb-6">
          <Popover
            modal={true}
            open={isPopoverOpen}
            onOpenChange={handlePopoverOpenChange}
          >
            <PopoverTrigger
              asChild
              disabled={isModelsLoading}
              className="flex cursor-pointer justify-start"
            >
              <Button
                variant="outline"
                className="h-14 w-full justify-between rounded-lg border-transparent bg-muted px-6 text-left shadow-none hover:bg-muted/80"
              >
                <span className="min-w-0 truncate">
                  {selectedModel
                    ? selectedModel.name
                    : isModelsLoading
                    ? language === "spanish"
                      ? "Cargando modelos..."
                      : "Loading models..."
                    : t("api_setup_select_pro")}
                </span>
                <span className="ml-3 flex shrink-0 items-center gap-2">
                  {selectedModel ? (
                    <>
                      <Badge variant="outline">{selectedModel.provider}</Badge>
                      <Badge variant="secondary">
                        {selectedModel.modality}
                      </Badge>
                    </>
                  ) : null}
                  <ChevronDown className="size-4 text-muted-foreground" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              className="w-[640px] max-w-[calc(100vw-20rem)] overflow-hidden rounded-xl p-0"
            >
              <Command shouldFilter={true}>
                <CommandInput
                  placeholder={
                    language === "spanish"
                      ? "Buscar modelo..."
                      : "Search model..."
                  }
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList
                  ref={commandListRef}
                  className="max-h-[360px] overflow-y-auto"
                >
                  <CommandEmpty>
                    {language === "spanish"
                      ? "No se encontraron modelos."
                      : "No models found."}
                  </CommandEmpty>
                  <CommandGroup className="p-2">
                    {models.map((model, index) => (
                      <CommandItem
                        disabled={!model?.isAvailable}
                        key={`${model?.id}-${index}`}
                        className="cursor-pointer rounded-lg px-3 py-3"
                        onSelect={() => handleModelSelect(model)}
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">
                              {model.name}
                            </p>
                            <Badge variant="outline">{model.modality}</Badge>
                            <Badge variant="secondary">
                              {model.isAvailable
                                ? model.provider
                                : language === "spanish"
                                ? "No disponible"
                                : "Not available"}
                            </Badge>
                            {selectedModel?.id === model.id ? (
                              <CheckCircle2Icon className="ml-auto size-4 text-primary" />
                            ) : null}
                          </div>
                          <p
                            className="mt-1 line-clamp-2 text-sm text-muted-foreground"
                            title={model.description}
                          >
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
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {!storedLicenseKey ? (
          <div className="flex flex-col items-stretch gap-4 sm:flex-row">
            <Input
              type="password"
              placeholder={t("api_setup_license_key_placeholder")}
              value={licenseKey}
              onChange={(event) => {
                setLicenseKey(event.target.value);
                setError(null);
                setSuccess(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-14 flex-1 rounded-lg border-transparent bg-muted px-6"
            />
            <Button
              onClick={handleActivateLicense}
              disabled={isLoading || !licenseKey.trim()}
              className="h-14 rounded-lg px-8 font-semibold"
            >
              {isLoading ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <KeyIcon className="size-4" />
              )}
              {language === "spanish" ? "Guardar cambios" : "Save changes"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-stretch gap-4 sm:flex-row">
            <Input
              type="text"
              value={maskedLicenseKey || ""}
              disabled={true}
              className="h-14 flex-1 rounded-lg border-transparent bg-muted px-6"
            />
            <Button
              onClick={handleRemoveLicense}
              disabled={isLoading}
              variant="destructive"
              className="h-14 rounded-lg px-8 font-semibold"
            >
              {isLoading ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <TrashIcon className="size-4" />
              )}
              {t("api_setup_remove")}
            </Button>
          </div>
        )}
      </section>

      <section className="flex flex-col justify-between gap-6 rounded-xl bg-card p-8 shadow-sm shadow-black/5 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <h2 className="mb-1 text-lg font-semibold text-primary">
            {language === "spanish" ? "Tu Plan" : "Your Plan"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {hasActiveLicense
              ? language === "spanish"
                ? "Actualmente estas usando el nivel mas avanzado."
                : "You are currently on the most advanced tier."
              : language === "spanish"
              ? "Activa una licencia para usar funciones premium."
              : "Activate a license to use premium features."}
          </p>
          <div className="text-3xl font-bold tracking-tight text-primary">
            {hasActiveLicense ? "Premium Plan" : "Free Plan"}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span
            className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-bold ${
              hasActiveLicense
                ? "border-green-500/20 bg-green-500/10 text-green-600"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`mr-2 size-2 rounded-full ${
                hasActiveLicense ? "bg-green-500" : "bg-muted-foreground"
              }`}
            />
            {hasActiveLicense ? t("active") : t("inactive")}
          </span>
          <label className="flex items-center gap-3 text-sm font-medium text-primary">
            {invisibleaiApiEnabled
              ? t("api_setup_disable_api")
              : t("api_setup_enable_api")}
            <Switch
              checked={invisibleaiApiEnabled}
              onCheckedChange={setInvisibleAIApiEnabled}
              disabled={!storedLicenseKey || !hasActiveLicense}
            />
          </label>
        </div>
      </section>
    </>
  );
};
