import {
  AI_PROVIDERS,
  DEFAULT_SYSTEM_PROMPT,
  SPEECH_TO_TEXT_PROVIDERS,
  STORAGE_KEYS,
} from "@/config";
import { getPlatform, safeLocalStorage, trackAppStart } from "@/lib";
import {
  getCustomAiProviders,
  getCustomSttProviders,
  getShortcutsConfig,
} from "@/lib/storage";
import {
  getCustomizableState,
  setCustomizableState,
  updateAppIconVisibility,
  updateAlwaysOnTop,
  updateAutostart,
  updateContentProtected,
  CustomizableState,
  DEFAULT_CUSTOMIZABLE_STATE,
  CursorType,
  updateCursorType,
} from "@/lib/storage";
import { IContextType, ScreenshotConfig, TYPE_PROVIDER, UsageBalanceInfo } from "@/types";
import { serverApi } from "@/lib/server-api";
import curl2Json from "@bany/curl-to-json";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const AppContext = createContext<IContextType | undefined>(undefined);

const getValidCustomProviders = (
  providers: TYPE_PROVIDER[],
  providerType: "AI" | "STT"
) => {
  return providers
    .filter((provider) => {
      try {
        curl2Json(provider.curl);
        return true;
      } catch {
        return false;
      }
    })
    .map((provider) => ({
      ...provider,
      isCustom: true,
      curl:
        providerType === "STT"
          ? provider.curl.replace(/AUDIO_BASE64/g, "AUDIO")
          : provider.curl,
    }));
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [systemPrompt, setSystemPrompt] = useState<string>(
    safeLocalStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT) ||
      DEFAULT_SYSTEM_PROMPT
  );

  const [selectedAudioDevices, setSelectedAudioDevices] = useState<{
    input: { id: string; name: string };
    output: { id: string; name: string };
  }>(() => {
    const savedDevices = safeLocalStorage.getItem(
      STORAGE_KEYS.SELECTED_AUDIO_DEVICES
    );
    if (savedDevices) {
      try {
        return JSON.parse(savedDevices);
      } catch {

      }
    }

    return {
      input: { id: "", name: "" },
      output: { id: "", name: "" },
    };
  });

  const [selectedAIProvider, setSelectedAIProvider] = useState<{
    provider: string;
    variables: Record<string, string>;
  }>({
    provider: "",
    variables: {},
  });
  const [customAiProviders, setCustomAiProviders] = useState<TYPE_PROVIDER[]>(
    []
  );

  const [selectedSttProvider, setSelectedSttProvider] = useState<{
    provider: string;
    variables: Record<string, string>;
  }>({
    provider: "",
    variables: {},
  });
  const [customSttProviders, setCustomSttProviders] = useState<TYPE_PROVIDER[]>(
    []
  );

  const [screenshotConfiguration, setScreenshotConfiguration] =
    useState<ScreenshotConfig>({
      mode: "manual",
      autoPrompt: "Analyze this screenshot and provide insights",
      enabled: true,
    });

  const [customizable, setCustomizable] = useState<CustomizableState>(
    DEFAULT_CUSTOMIZABLE_STATE
  );
  const [hasActiveLicense, setHasActiveLicense] = useState<boolean>(false);
  const [supportsImages, setSupportsImagesState] = useState<boolean>(() => {
    const stored = safeLocalStorage.getItem(STORAGE_KEYS.SUPPORTS_IMAGES);
    return stored === null ? true : stored === "true";
  });

  const setSupportsImages = (value: boolean) => {
    setSupportsImagesState(value);
    safeLocalStorage.setItem(STORAGE_KEYS.SUPPORTS_IMAGES, String(value));
  };

  const [usageBalance, setUsageBalance] = useState<UsageBalanceInfo | null>(null);

  // Default ON so every new user connects to the server out of the box.
  // Stored as "false" explicitly when the user turns it off; anything else = ON.
  const [invisibleaiApiEnabled, setInvisibleAIApiEnabledState] = useState<boolean>(
    safeLocalStorage.getItem(STORAGE_KEYS.INVISIBLEAI_API_ENABLED) !== "false"
  );

  const getActiveLicenseStatus = async () => {
    const response: { is_active: boolean; is_dev_license: boolean } =
      await invoke("validate_license_api");
    setHasActiveLicense(response.is_active);

    // Dev licenses are internal-only — always force server API off so devs
    // use their own providers and don't consume server quota accidentally.
    if (response?.is_dev_license) {
      setInvisibleAIApiEnabled(false);
    }
    // Free users (no active license) can still use the server in free-tier mode —
    // do NOT force the toggle off for them.

    const autoConfigsEnabled = localStorage.getItem("auto-configs-enabled");
    if (response.is_active && !autoConfigsEnabled) {
      setScreenshotConfiguration({
        mode: "auto",
        autoPrompt: "Analyze the screenshot and provide insights",
        enabled: false,
      });

      localStorage.setItem("auto-configs-enabled", "true");
    }
  };

  useEffect(() => {
    const syncLicenseState = async () => {
      try {
        await invoke("set_license_status", {
          hasLicense: hasActiveLicense,
        });

        const config = getShortcutsConfig();
        await invoke("update_shortcuts", { config });
      } catch (error) {
        console.error("Failed to synchronize license state:", error);
      }
    };

    syncLicenseState();
  }, [hasActiveLicense]);

  const loadData = () => {

    const savedSystemPrompt = safeLocalStorage.getItem(
      STORAGE_KEYS.SYSTEM_PROMPT
    );
    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt || DEFAULT_SYSTEM_PROMPT);
    }

    const savedScreenshotConfig = safeLocalStorage.getItem(
      STORAGE_KEYS.SCREENSHOT_CONFIG
    );
    if (savedScreenshotConfig) {
      try {
        const parsed = JSON.parse(savedScreenshotConfig);
        if (typeof parsed === "object" && parsed !== null) {
          setScreenshotConfiguration({
            mode: parsed.mode || "manual",
            autoPrompt:
              parsed.autoPrompt ||
              "Analyze this screenshot and provide insights",
            enabled: parsed.enabled !== undefined ? parsed.enabled : false,
          });
        }
      } catch {
        console.warn("Failed to parse screenshot configuration");
      }
    }

    const aiList = getValidCustomProviders(getCustomAiProviders(), "AI");
    const sttList = getValidCustomProviders(getCustomSttProviders(), "STT");
    setCustomAiProviders(aiList);
    setCustomSttProviders(sttList);

    const savedSelectedAi = safeLocalStorage.getItem(
      STORAGE_KEYS.SELECTED_AI_PROVIDER
    );
    if (savedSelectedAi) {
      try {
        const parsed = JSON.parse(savedSelectedAi);
        const providers = [...AI_PROVIDERS, ...aiList];
        if (providers.some((provider) => provider.id === parsed?.provider)) {
          setSelectedAIProvider(parsed);
        } else {
          safeLocalStorage.removeItem(STORAGE_KEYS.SELECTED_AI_PROVIDER);
          setSelectedAIProvider({ provider: "", variables: {} });
        }
      } catch {
        safeLocalStorage.removeItem(STORAGE_KEYS.SELECTED_AI_PROVIDER);
      }
    }

    const savedSelectedStt = safeLocalStorage.getItem(
      STORAGE_KEYS.SELECTED_STT_PROVIDER
    );
    if (savedSelectedStt) {
      try {
        const parsed = JSON.parse(savedSelectedStt);
        const providers = [...SPEECH_TO_TEXT_PROVIDERS, ...sttList];
        if (providers.some((provider) => provider.id === parsed?.provider)) {
          setSelectedSttProvider(parsed);
        } else {
          safeLocalStorage.removeItem(STORAGE_KEYS.SELECTED_STT_PROVIDER);
          setSelectedSttProvider({ provider: "", variables: {} });
        }
      } catch {
        safeLocalStorage.removeItem(STORAGE_KEYS.SELECTED_STT_PROVIDER);
      }
    }

    const customizableState = getCustomizableState();
    setCustomizable(customizableState);

    updateCursor(customizableState.cursor.type || "invisible");

    const stored = safeLocalStorage.getItem(STORAGE_KEYS.CUSTOMIZABLE);
    if (!stored) {

      setCustomizableState(customizableState);
    } else {

      try {
        const parsed = JSON.parse(stored);
        if (!parsed.autostart) {

          setCustomizableState(customizableState);
          updateCursor(customizableState.cursor.type || "invisible");
        }
      } catch (error) {
        console.debug("Failed to check customizable state schema:", error);
      }
    }

    const savedInvisibleAIApiEnabled = safeLocalStorage.getItem(
      STORAGE_KEYS.INVISIBLEAI_API_ENABLED
    );
    if (savedInvisibleAIApiEnabled !== null) {
      setInvisibleAIApiEnabledState(savedInvisibleAIApiEnabled === "true");
    }

    const savedAudioDevices = safeLocalStorage.getItem(
      STORAGE_KEYS.SELECTED_AUDIO_DEVICES
    );
    if (savedAudioDevices) {
      try {
        const parsed = JSON.parse(savedAudioDevices);
        if (parsed && typeof parsed === "object") {
          setSelectedAudioDevices(parsed);
        }
      } catch {
        console.warn("Failed to parse selected audio devices");
      }
    }
  };

  const updateCursor = (type: CursorType | undefined) => {
    try {
      const currentWindow = getCurrentWindow();
      const platform = getPlatform();

      if (platform === "linux") {
        document.documentElement.style.setProperty("--cursor-type", "default");
        return;
      }
      const windowLabel = currentWindow.label;

      if (windowLabel === "dashboard") {

        document.documentElement.style.setProperty("--cursor-type", "default");
        return;
      }

      const safeType = type || "invisible";
      const cursorValue = type === "invisible" ? "none" : safeType;
      document.documentElement.style.setProperty("--cursor-type", cursorValue);
    } catch (error) {
      document.documentElement.style.setProperty("--cursor-type", "default");
    }
  };

  /**
   * Sincroniza credenciales y saldo de uso contra el servidor.
   * Siempre se ejecuta en background — nunca bloquea el arranque de la app.
   *
   * - Si el servidor no responde (red caída, Render frío) → mantiene
   *   las credenciales locales y la sesión sigue funcionando.
   * - Solo revoca el acceso si el servidor confirma explícitamente
   *   que la licencia está revocada o expirada.
   */
  const syncServerCredentials = async () => {
    try {
      const storage = await invoke<{
        instance_id?: string;
        license_key?: string;
      }>("secure_storage_get");
      const instanceId = storage.instance_id || "";
      const licenseKey = storage.license_key || "";

      if (!instanceId) {
        setUsageBalance(null);
        return;
      }

      serverApi.setCredentials(instanceId, licenseKey || undefined);

      if (licenseKey === "invisibleai-admin-local") {
        const balance = await serverApi.getUsageBalance().catch(() => null);
        if (balance) setUsageBalance(balance);
        return;
      }

      try {
        const validation = await serverApi.validate(licenseKey, instanceId);
        if (!validation.valid) {
          throw new Error("License revoked on server");
        }

        // Cargar saldo de uso
        const balance = await serverApi.getUsageBalance().catch(() => null);
        if (balance) setUsageBalance(balance);

        // Refrescar credenciales directas (Groq + Deepgram) en background
        try {
          const creds = await serverApi.getCredentials(licenseKey, instanceId);
          const saveItems: { key: string; value: string }[] = [
            { key: "groq_api_key", value: creds.groqApiKey },
            { key: "groq_model",   value: creds.model },
          ];
          if (creds.deepgramApiKey)    saveItems.push({ key: "deepgram_api_key",    value: creds.deepgramApiKey });
          if (creds.deepgramModel)     saveItems.push({ key: "deepgram_model",       value: creds.deepgramModel });
          if (creds.deepgramLanguage)  saveItems.push({ key: "deepgram_language",    value: creds.deepgramLanguage });
          if (creds.licenseExpiresAt)  saveItems.push({ key: "license_expires_at",   value: creds.licenseExpiresAt });
          await invoke("secure_storage_save", { items: saveItems });
        } catch (credErr) {
          console.debug("Failed to refresh direct credentials:", credErr);
        }

      } catch (valErr: any) {
        const errStr = valErr?.message || String(valErr);

        // Red caída o Render frío → mantener estado local, no revocar
        const isNetworkError =
          errStr.includes("Network error") ||
          errStr.includes("Failed to fetch") ||
          errStr.includes("Server error 5") ||
          errStr.includes("connect") ||
          errStr.includes("timeout");

        if (isNetworkError) {
          console.debug("Server unreachable, keeping local credentials:", errStr);
          return;
        }

        // Revocación explícita confirmada por el servidor
        console.warn("License revoked by server, clearing local credentials:", errStr);
        await invoke("secure_storage_remove", {
          keys: [
            "invisibleai_license_key",
            "invisibleai_instance_id",
            "groq_api_key",
            "groq_model",
            "deepgram_api_key",
            "deepgram_model",
            "deepgram_language",
            "license_expires_at",
          ],
        }).catch(() => {});
        setHasActiveLicense(false);
        setUsageBalance(null);
        setInvisibleAIApiEnabled(false);
      }
    } catch {
      setUsageBalance(null);
    }
  };

  useEffect(() => {
    // Registrar callback para que serverApi actualice el saldo cuando cambia
    serverApi.setOnUsageUpdate((balance) => setUsageBalance(balance));

    const initializeApp = async () => {
      // 1. Verificar licencia local (lee archivo local — instantáneo)
      await getActiveLicenseStatus();

      // 2. Registrar credenciales en serverApi desde storage local
      //    para que las llamadas en background puedan autenticarse
      try {
        const storage = await invoke<{ instance_id?: string; license_key?: string }>("secure_storage_get");
        if (storage.instance_id) {
          serverApi.setCredentials(storage.instance_id, storage.license_key ?? "");
        }
      } catch {
        // Non-fatal
      }

      // 3. Track app start (no bloquea)
      try {
        const appVersion = await invoke<string>("get_app_version");
        const storage = await invoke<{ instance_id?: string }>("secure_storage_get");
        trackAppStart(appVersion, storage.instance_id || "").catch(() => {});
      } catch {
        // Non-fatal
      }

      // 4. Sincronizar con el servidor en background — nunca bloquea el arranque.
      //    La app ya es funcional con las credenciales locales.
      syncServerCredentials().catch(() => {});
    };

    loadData();
    initializeApp();
  }, []);

  useEffect(() => {
    const applyCustomizableSettings = async () => {
      try {
        await Promise.all([
          invoke("set_app_icon_visibility", {
            visible: customizable.appIcon.isVisible,
          }),
          invoke("set_always_on_top", {
            enabled: customizable.alwaysOnTop.isEnabled,
          }),
          invoke("set_content_protected", {
            enabled: customizable.contentProtected.isEnabled,
          }),
        ]);
      } catch (error) {
        console.error("Failed to apply customizable settings:", error);
      }
    };

    applyCustomizableSettings();
  }, [customizable]);

  useEffect(() => {
    const initializeAutostart = async () => {
      try {
        const autostartInitialized = safeLocalStorage.getItem(
          STORAGE_KEYS.AUTOSTART_INITIALIZED
        );

        if (!autostartInitialized) {
          const autostartEnabled = customizable?.autostart?.isEnabled ?? true;

          if (autostartEnabled) {
            await enable();
          } else {
            await disable();
          }

          safeLocalStorage.setItem(STORAGE_KEYS.AUTOSTART_INITIALIZED, "true");
        }
      } catch (error) {
        console.debug("Autostart initialization skipped:", error);
      }
    };

    initializeAutostart();
  }, []);

  useEffect(() => {
    const handleAppIconVisibility = async (isVisible: boolean) => {
      try {
        await invoke("set_app_icon_visibility", { visible: isVisible });
      } catch (error) {
        console.error("Failed to set app icon visibility:", error);
      }
    };

    const unlistenHide = listen("handle-app-icon-on-hide", async () => {
      const currentState = getCustomizableState();

      if (!currentState.appIcon.isVisible) {
        await handleAppIconVisibility(false);
      }
    });

    const unlistenShow = listen("handle-app-icon-on-show", async () => {

      await handleAppIconVisibility(true);
    });

    return () => {
      unlistenHide.then((fn) => fn());
      unlistenShow.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {

      if (e.key === STORAGE_KEYS.SUPPORTS_IMAGES && e.newValue !== null) {
        setSupportsImagesState(e.newValue === "true");
      }

      if (
        e.key === STORAGE_KEYS.CUSTOM_AI_PROVIDERS ||
        e.key === STORAGE_KEYS.CUSTOM_SPEECH_PROVIDERS ||
        e.key === STORAGE_KEYS.SELECTED_AI_PROVIDER ||
        e.key === STORAGE_KEYS.SELECTED_STT_PROVIDER ||
        e.key === STORAGE_KEYS.SYSTEM_PROMPT ||
        e.key === STORAGE_KEYS.SCREENSHOT_CONFIG ||
        e.key === STORAGE_KEYS.CUSTOMIZABLE ||
        e.key === STORAGE_KEYS.SELECTED_AUDIO_DEVICES ||
        e.key === STORAGE_KEYS.INVISIBLEAI_API_ENABLED
      ) {
        loadData();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const checkImageSupport = async () => {
      if (invisibleaiApiEnabled) {
        // Derive vision support from the locally stored model name.
        // All Llama 4 / Scout models on Groq support vision natively, so
        // if a local key is present we never need to call the server for this.
        try {
          const storage = await invoke<{
            groq_api_key?: string;
            groq_model?: string;
          }>("secure_storage_get");

          if (storage.groq_api_key) {
            const model = storage.groq_model ?? "";
            const supportsVision =
              !model ||
              model.includes("llama-4") ||
              model.includes("scout") ||
              model.includes("vision");
            setSupportsImages(supportsVision);
          } else {
            // No local key → free-tier proxy; ask server
            try {
              const storageAuth = await invoke<{ license_key?: string; instance_id?: string }>("secure_storage_get");
              const config = await serverApi.getConfig(storageAuth.license_key, storageAuth.instance_id);
              setSupportsImages(config.chat.supportsVision ?? true);
            } catch {
              setSupportsImages(true);
            }
          }
        } catch {
          setSupportsImages(true);
        }
      } else {

        const provider = allAiProviders.find(
          (p) => p.id === selectedAIProvider.provider
        );
        if (provider) {
          const hasImageSupport = provider.curl?.includes("{{IMAGE}}") ?? false;
          setSupportsImages(hasImageSupport);
        } else {
          setSupportsImages(true);
        }
      }
    };

    checkImageSupport();
  }, [invisibleaiApiEnabled, selectedAIProvider.provider]);


  useEffect(() => {
    if (selectedAIProvider.provider) {
      safeLocalStorage.setItem(
        STORAGE_KEYS.SELECTED_AI_PROVIDER,
        JSON.stringify(selectedAIProvider)
      );
    }
  }, [selectedAIProvider]);

  useEffect(() => {
    if (selectedAIProvider.provider !== "ollama") return;

    const vars = selectedAIProvider.variables || {};
    const modelName = vars.model || vars.MODEL;
    if (!modelName) return;

    const ollamaProvider = AI_PROVIDERS.find((p) => p.id === "ollama");
    let baseUrl = "http://localhost:11434";
    if (ollamaProvider?.curl) {
      const urlMatch = ollamaProvider.curl.match(/https?:\/\/[^\s/]+(?::\d+)?/);
      if (urlMatch) baseUrl = urlMatch[0];
    }

    const controller = new AbortController();

    fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        prompt: "",
        keep_alive: "10m",
      }),
      signal: controller.signal,
    }).catch(() => {

    });

    return () => controller.abort();
  }, [selectedAIProvider.provider, selectedAIProvider.variables]);

  useEffect(() => {
    if (selectedSttProvider.provider) {
      safeLocalStorage.setItem(
        STORAGE_KEYS.SELECTED_STT_PROVIDER,
        JSON.stringify(selectedSttProvider)
      );
    }
  }, [selectedSttProvider]);

  const allAiProviders: TYPE_PROVIDER[] = [
    ...AI_PROVIDERS,
    ...customAiProviders,
  ];

  // Free users don't see streaming STT providers (e.g. deepgram-streaming).
  // Licensed users see all providers. Custom providers are always shown.
  const allSttProviders: TYPE_PROVIDER[] = [
    ...SPEECH_TO_TEXT_PROVIDERS.filter((p) => !p.streaming || hasActiveLicense),
    ...customSttProviders,
  ];

  const onSetSelectedAIProvider = ({
    provider,
    variables,
  }: {
    provider: string;
    variables: Record<string, string>;
  }) => {
    if (provider && !allAiProviders.some((p) => p.id === provider)) {
      console.warn(`Invalid AI provider ID: ${provider}`);
      return;
    }

    if (!invisibleaiApiEnabled) {
      const selectedProvider = allAiProviders.find((p) => p.id === provider);
      if (selectedProvider) {
        const hasImageSupport =
          selectedProvider.curl?.includes("{{IMAGE}}") ?? false;
        setSupportsImages(hasImageSupport);
      } else {
        setSupportsImages(true);
      }
    }

    setSelectedAIProvider((prev) => ({
      ...prev,
      provider,
      variables,
    }));
  };

  const onSetSelectedSttProvider = ({
    provider,
    variables,
  }: {
    provider: string;
    variables: Record<string, string>;
  }) => {
    if (provider && !allSttProviders.some((p) => p.id === provider)) {
      console.warn(`Invalid STT provider ID: ${provider}`);
      return;
    }

    setSelectedSttProvider((prev) => ({ ...prev, provider, variables }));
  };

  const toggleAppIconVisibility = async (isVisible: boolean) => {
    const newState = updateAppIconVisibility(isVisible);
    setCustomizable(newState);
    try {
      await invoke("set_app_icon_visibility", { visible: isVisible });
      loadData();
    } catch (error) {
      console.error("Failed to toggle app icon visibility:", error);
    }
  };

  const toggleAlwaysOnTop = async (isEnabled: boolean) => {
    const newState = updateAlwaysOnTop(isEnabled);
    setCustomizable(newState);
    try {
      await invoke("set_always_on_top", { enabled: isEnabled });
      loadData();
    } catch (error) {
      console.error("Failed to toggle always on top:", error);
    }
  };

  const toggleAutostart = async (isEnabled: boolean) => {
    const newState = updateAutostart(isEnabled);
    setCustomizable(newState);
    try {
      if (isEnabled) {
        await enable();
      } else {
        await disable();
      }
      loadData();
    } catch (error) {
      console.error("Failed to toggle autostart:", error);
      const revertedState = updateAutostart(!isEnabled);
      setCustomizable(revertedState);
    }
  };

  const setCursorType = (type: CursorType) => {
    setCustomizable((prev) => ({ ...prev, cursor: { type } }));
    updateCursor(type);
    updateCursorType(type);
    loadData();
  };

  const toggleContentProtected = async (isEnabled: boolean) => {
    const newState = updateContentProtected(isEnabled);
    setCustomizable(newState);
    try {
      await invoke("set_content_protected", { enabled: isEnabled });
      loadData();
    } catch (error) {
      console.error("Failed to toggle content protection:", error);
    }
  };

  const setInvisibleAIApiEnabled = async (enabled: boolean) => {
    setInvisibleAIApiEnabledState(enabled);
    safeLocalStorage.setItem(STORAGE_KEYS.INVISIBLEAI_API_ENABLED, String(enabled));

    if (enabled) {
      try {
        const storage = await invoke<{
          selected_invisibleai_model?: string;
        }>("secure_storage_get");

        if (storage.selected_invisibleai_model) {
          const model = JSON.parse(storage.selected_invisibleai_model);
          const hasImageSupport = (model.modality?.includes("image") || model.modality?.includes("vision")) ?? false;
          setSupportsImages(hasImageSupport);
        } else {

          setSupportsImages(false);
        }
      } catch (error) {
        console.debug("Failed to check InvisibleAI model image support:", error);
        setSupportsImages(false);
      }
    } else {

      const provider = allAiProviders.find(
        (p) => p.id === selectedAIProvider.provider
      );
      if (provider) {
        const hasImageSupport = provider.curl?.includes("{{IMAGE}}") ?? false;
        setSupportsImages(hasImageSupport);
      } else {
        setSupportsImages(true);
      }
    }

    loadData();
  };

  const value: IContextType = {
    systemPrompt,
    setSystemPrompt,
    allAiProviders,
    customAiProviders,
    selectedAIProvider,
    onSetSelectedAIProvider,
    allSttProviders,
    customSttProviders,
    selectedSttProvider,
    onSetSelectedSttProvider,
    screenshotConfiguration,
    setScreenshotConfiguration,
    customizable,
    toggleAppIconVisibility,
    toggleAlwaysOnTop,
    toggleAutostart,
    loadData,
    invisibleaiApiEnabled,
    setInvisibleAIApiEnabled,
    hasActiveLicense,
    setHasActiveLicense,
    getActiveLicenseStatus,
    selectedAudioDevices,
    setSelectedAudioDevices,
    setCursorType,
    toggleContentProtected,
    supportsImages,
    setSupportsImages,
    usageBalance,
    refreshUsageBalance: syncServerCredentials,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used within a AppProvider");
  }

  return context;
};
