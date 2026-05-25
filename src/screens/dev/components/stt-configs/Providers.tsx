import { Button, Header, Input, Selection, TextInput } from "@/components";
import { useTranslation } from "@/hooks";
import { UseSettingsReturn } from "@/types";
import { KeyIcon, TrashIcon } from "lucide-react";

export const Providers = ({
  allSttProviders,
  selectedSttProvider,
  onSetSelectedSttProvider,
  sttVariables,
}: UseSettingsReturn) => {
  const { t } = useTranslation();

  const selectedProviderName =
    allSttProviders?.find((p) => p?.id === selectedSttProvider?.provider)?.name ||
    selectedSttProvider?.provider ||
    t("dev_provider_fallback");

  const findKeyAndValue = (key: string) => {
    return sttVariables?.find((v) => v?.key === key);
  };

  const getApiKeyValue = () => {
    const apiKeyVar = findKeyAndValue("api_key");
    if (!apiKeyVar || !selectedSttProvider?.variables) return "";
    return selectedSttProvider?.variables?.[apiKeyVar.key] || "";
  };

  const isApiKeyEmpty = () => {
    return !getApiKeyValue().trim();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Header
            title={t("dev_select_stt_provider")}
            description={t("dev_select_stt_provider_desc")}
          />
          {allSttProviders?.find((p) => p?.id === selectedSttProvider?.provider)?.streaming && (
            <span className="px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 dark:bg-zinc-400/5 border border-zinc-500/20 rounded-full animate-pulse select-none shrink-0">
              ⚡ Streaming
            </span>
          )}
        </div>
        <Selection
          selected={selectedSttProvider?.provider}
          options={allSttProviders?.map((provider) => ({
            label: provider?.name || provider?.id || t("dev_provider_fallback"),
            value: provider?.id || t("dev_provider_fallback"),
          }))}
          placeholder={t("dev_choose_stt_provider")}
          onChange={(value) => {
            onSetSelectedSttProvider({
              provider: value,
              variables: {},
            });
          }}
        />
      </div>
      {findKeyAndValue("api_key") ? (
        <div className="space-y-2">
          <Header
            title={t("dev_api_key")}
            description={t("dev_api_key_desc").replace(
              "{provider}",
              selectedProviderName
            )}
          />

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="**********"
                value={getApiKeyValue()}
                onChange={(value) => {
                  const apiKeyVar = findKeyAndValue("api_key");
                  if (!apiKeyVar || !selectedSttProvider) return;

                  onSetSelectedSttProvider({
                    ...selectedSttProvider,
                    variables: {
                      ...selectedSttProvider.variables,
                      [apiKeyVar.key]:
                        typeof value === "string" ? value : value.target.value,
                    },
                  });
                }}
                disabled={false}
                className="flex-1 h-10 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm focus:border-primary/50 transition-colors"
              />
              {isApiKeyEmpty() ? (
                <Button
                  onClick={() => {
                    const apiKeyVar = findKeyAndValue("api_key");
                    if (!apiKeyVar || !selectedSttProvider || isApiKeyEmpty())
                      return;

                    onSetSelectedSttProvider({
                      ...selectedSttProvider,
                      variables: {
                        ...selectedSttProvider.variables,
                        [apiKeyVar.key]: getApiKeyValue(),
                      },
                    });
                  }}
                  disabled={isApiKeyEmpty()}
                  size="icon"
                  className="shrink-0 h-10 w-10 rounded-xl"
                  title={t("dev_submit_api_key")}
                >
                  <KeyIcon className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const apiKeyVar = findKeyAndValue("api_key");
                    if (!apiKeyVar || !selectedSttProvider) return;

                    onSetSelectedSttProvider({
                      ...selectedSttProvider,
                      variables: {
                        ...selectedSttProvider.variables,
                        [apiKeyVar.key]: "",
                      },
                    });
                  }}
                  size="icon"
                  variant="destructive"
                  className="shrink-0 h-10 w-10 rounded-xl"
                  title={t("dev_remove_api_key")}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4 mt-2">
        {sttVariables
          ?.filter((variable) => variable?.key === "model")
          .map((variable) => {
            const getVariableValue = () => {
              if (!variable?.key || !selectedSttProvider?.variables) return "";
              return selectedSttProvider.variables[variable.key] || "";
            };

            return (
              <div className="space-y-1" key={variable?.key}>
                <Header
                  title={t("dev_model")}
                  description={t("dev_model_desc").replace(
                    "{provider}",
                    selectedProviderName
                  )}
                />
                <TextInput
                  placeholder={selectedSttProvider?.provider === "deepgram-streaming" ? "nova-3" : t("dev_model_placeholder")}
                  value={getVariableValue()}
                  onChange={(value) => {
                    if (!variable?.key || !selectedSttProvider) return;

                    onSetSelectedSttProvider({
                      ...selectedSttProvider,
                      variables: {
                        ...selectedSttProvider.variables,
                        [variable.key]: value,
                      },
                    });
                  }}
                />
              </div>
            );
          })}

        {sttVariables
          ?.filter((variable) => variable?.key === "language")
          .map((variable) => {
            const getVariableValue = () => {
              if (!variable?.key || !selectedSttProvider?.variables) return "";
              return selectedSttProvider.variables[variable.key] || "";
            };

            return (
              <div className="space-y-1" key={variable?.key}>
                <Header
                  title="Language"
                  description={`Specify the language code (e.g. es-419, en-US) for ${selectedProviderName}`}
                />
                <TextInput
                  placeholder="es-419"
                  value={getVariableValue()}
                  onChange={(value) => {
                    if (!variable?.key || !selectedSttProvider) return;

                    onSetSelectedSttProvider({
                      ...selectedSttProvider,
                      variables: {
                        ...selectedSttProvider.variables,
                        [variable.key]: value,
                      },
                    });
                  }}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
};
