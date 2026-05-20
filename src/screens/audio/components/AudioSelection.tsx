import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Header,
  Button,
} from "@/components";
import { MicIcon, RefreshCwIcon, HeadphonesIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useApp } from "@/contexts";
import { STORAGE_KEYS } from "@/config/constants";
import { safeLocalStorage } from "@/lib/storage";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "@/hooks";

export const AudioSelection = () => {
  const { selectedAudioDevices, setSelectedAudioDevices } = useApp();
  const { t } = useTranslation();

  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [showSuccess, setShowSuccess] = useState<{
    input: boolean;
    output: boolean;
  }>({
    input: false,
    output: false,
  });
  const [devices, setDevices] = useState<{
    input: { id: string; name: string; is_default: boolean }[];
    output: { id: string; name: string; is_default: boolean }[];
  }>({
    input: [],
    output: [],
  });

  const saveToStorage = (newDevices: typeof selectedAudioDevices) => {
    safeLocalStorage.setItem(
      STORAGE_KEYS.SELECTED_AUDIO_DEVICES,
      JSON.stringify(newDevices)
    );
  };

  const loadAudioDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const [inputDevices, outputDevices] = await Promise.all([
        invoke<{ id: string; name: string; is_default: boolean }[]>(
          "get_input_devices"
        ),
        invoke<{ id: string; name: string; is_default: boolean }[]>(
          "get_output_devices"
        ),
      ]);

      setDevices({
        input:
          inputDevices.map((input) => ({
            id: input?.id,
            name: input?.name,
            is_default: input?.is_default,
          })) || [],
        output:
          outputDevices.map((output) => ({
            id: output?.id,
            name: output?.name,
            is_default: output?.is_default,
          })) || [],
      });

      const currentInputExists = inputDevices.some(
        (d) => d.id === selectedAudioDevices.input.id
      );
      const currentOutputExists = outputDevices.some(
        (d) => d.id === selectedAudioDevices.output.id
      );

      if (!currentInputExists || !currentOutputExists) {
        const defaultInput = inputDevices?.find((d) => d?.is_default);
        const defaultOutput = outputDevices?.find((d) => d?.is_default);

        const newDevices = {
          input: currentInputExists
            ? selectedAudioDevices.input
            : {
                id: defaultInput?.id || inputDevices[0]?.id || "",
                name: defaultInput?.name || inputDevices[0]?.name || "",
              },
          output: currentOutputExists
            ? selectedAudioDevices.output
            : {
                id: defaultOutput?.id || outputDevices[0]?.id || "",
                name: defaultOutput?.name || outputDevices[0]?.name || "",
              },
        };

        setSelectedAudioDevices(newDevices);
        saveToStorage(newDevices);
      }
    } catch (error) {
      console.error("Error loading audio devices:", error);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadAudioDevices();
  }, []);

  const handleDeviceChange = (type: "input" | "output", deviceId: string) => {
    const deviceList = type === "input" ? devices.input : devices.output;
    const selectedDevice = deviceList.find((d) => d.id === deviceId);

    if (!selectedDevice) return;

    const newDevices = {
      ...selectedAudioDevices,
      [type]: { id: deviceId, name: selectedDevice.name },
    };

    setSelectedAudioDevices(newDevices);
    saveToStorage(newDevices);

    setShowSuccess((prev) => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setShowSuccess((prev) => ({ ...prev, [type]: false }));
    }, 3000);
  };

  return (
    <div id="audio" className="grid gap-5">
      <div className="space-y-3">
        <Header
          title={t("audio_mic_label")}
          description={t("audio_mic_desc")}
        />

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select
                value={selectedAudioDevices.input.id}
                onValueChange={(value) => handleDeviceChange("input", value)}
                disabled={isLoadingDevices || devices?.input?.length === 0}
              >
                <SelectTrigger className="w-full h-11 border-1 border-input/50 focus:border-primary/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <MicIcon className="size-4" />
                    <div className="text-sm font-medium truncate">
                      {isLoadingDevices
                        ? t("audio_mic_loading")
                        : devices?.input?.length === 0
                        ? t("audio_mic_none")
                        : devices?.input?.find(
                            (mic) => mic?.id === selectedAudioDevices.input.id
                          )?.name +
                            (devices?.input?.find(
                              (mic) => mic?.id === selectedAudioDevices.input.id
                            )?.is_default
                              ? t("audio_default_suffix")
                              : "") || t("audio_mic_placeholder")}
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {devices?.input?.map((mic) => (
                    <SelectItem key={mic?.id} value={mic?.id}>
                      <div className="flex items-center gap-2">
                        <MicIcon className="size-4" />
                        <div className="font-medium truncate">{mic?.name} </div>
                        {mic?.is_default && t("audio_default_suffix")}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="icon"
                variant="outline"
                onClick={loadAudioDevices}
                disabled={isLoadingDevices}
                className="h-11 w-11 shrink-0"
                title={t("audio_refresh_mic_title")}
              >
                <RefreshCwIcon
                  className={`size-4 ${isLoadingDevices ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {showSuccess.input && (
            <div className="text-xs text-green-500 bg-green-500/10 p-3 rounded-md">
              <strong>{t("audio_mic_success")}</strong>
              <br />
              {t("audio_using_prefix")}{selectedAudioDevices.input.name || "Unknown device"}
            </div>
          )}

          {devices?.input?.length === 0 && !isLoadingDevices && (
            <div className="text-xs text-amber-500 bg-amber-500/10 p-3 rounded-md">
              {t("audio_mic_refresh_tip")}
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-border/70" />

      <div className="space-y-3">
        <Header
          title={t("audio_sys_title")}
          description={t("audio_sys_desc")}
        />

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select
                value={selectedAudioDevices.output.id}
                onValueChange={(value) => handleDeviceChange("output", value)}
                disabled={isLoadingDevices || devices?.output?.length === 0}
              >
                <SelectTrigger className="w-full h-11 border-1 border-input/50 focus:border-primary/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <HeadphonesIcon className="size-4" />
                    <div className="text-sm font-medium truncate">
                      {isLoadingDevices
                        ? t("audio_sys_loading")
                        : devices?.output?.length === 0
                        ? t("audio_sys_none")
                        : devices?.output?.find(
                            (output) =>
                              output?.id === selectedAudioDevices.output.id
                          )?.name +
                            (devices?.output?.find(
                              (output) =>
                                output?.id === selectedAudioDevices.output.id
                            )?.is_default
                              ? t("audio_default_suffix")
                              : "") || t("audio_sys_placeholder")}
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {devices?.output?.map((output) => (
                    <SelectItem key={output?.id} value={output?.id}>
                      <div className="flex items-center gap-2">
                        <HeadphonesIcon className="size-4" />
                        <div className="font-medium truncate">
                          {output?.name} {output?.is_default && t("audio_default_suffix")}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="icon"
                variant="outline"
                onClick={loadAudioDevices}
                disabled={isLoadingDevices}
                className="h-11 w-11 shrink-0"
                title={t("audio_refresh_sys_title")}
              >
                <RefreshCwIcon
                  className={`size-4 ${isLoadingDevices ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {showSuccess.output && (
            <div className="text-xs text-green-500 bg-green-500/10 p-3 rounded-md">
              <strong>{t("audio_sys_success")}</strong>
              <br />
              {t("audio_using_prefix")}{selectedAudioDevices.output.name || "Unknown device"}
            </div>
          )}

          {devices?.output?.length === 0 && !isLoadingDevices && (
            <div className="text-xs text-amber-500 bg-amber-500/10 p-3 rounded-md">
              {t("audio_sys_refresh_tip")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
