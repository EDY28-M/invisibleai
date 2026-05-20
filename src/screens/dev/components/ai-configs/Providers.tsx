import { Button, Input, Selection, TextInput } from "@/components";
import { useTranslation } from "@/hooks";
import { UseSettingsReturn } from "@/types";
import { KeyIcon, TrashIcon } from "lucide-react";

export const Providers = ({
  allAiProviders,
  selectedAIProvider,
  onSetSelectedAIProvider,
  variables,
}: UseSettingsReturn) => {
  const { t } = useTranslation();

  const selectedProviderName =
    allAiProviders?.find((p) => p?.id === selectedAIProvider?.provider)?.name ||
    selectedAIProvider?.provider ||
    t("dev_provider_fallback");

  const findKeyAndValue = (key: string) => {
    return variables?.find((v) => v?.key === key);
  };

  const getApiKeyValue = () => {
    const apiKeyVar = findKeyAndValue("api_key");
    if (!apiKeyVar || !selectedAIProvider?.variables) return "";
    return selectedAIProvider?.variables?.[apiKeyVar.key] || "";
  };

  const isApiKeyEmpty = () => !getApiKeyValue().trim();

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h3 className="text-sm font-semibold text-foreground/95 tracking-wide">
          {t("dev_select_ai_provider")}
        </h3>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          {t("dev_select_ai_provider_desc")}
        </p>
      </div>

      {/* Provider Selection */}
      <Selection
        selected={selectedAIProvider?.provider}
        options={allAiProviders?.map((provider) => ({
          label: provider?.name || provider?.id || t("dev_provider_fallback"),
          value: provider?.id || t("dev_provider_fallback"),
        }))}
        placeholder={t("dev_choose_ai_provider")}
        onChange={(value) => {
          onSetSelectedAIProvider({ provider: value, variables: {} });
        }}
      />

      {/* API Key */}
      {findKeyAndValue("api_key") && (
        <div className="space-y-2 pt-2 border-t border-border/10">
          <div>
            <h3 className="text-sm font-semibold text-foreground/95 tracking-wide">
              {t("dev_api_key")}
            </h3>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {t("dev_api_key_desc").replace("{provider}", selectedProviderName)}
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="**********"
              value={getApiKeyValue()}
              onChange={(value) => {
                const apiKeyVar = findKeyAndValue("api_key");
                if (!apiKeyVar || !selectedAIProvider) return;
                onSetSelectedAIProvider({
                  ...selectedAIProvider,
                  variables: {
                    ...selectedAIProvider.variables,
                    [apiKeyVar.key]:
                      typeof value === "string" ? value : value.target.value,
                  },
                });
              }}
              disabled={false}
              className="flex-1 h-10 rounded-xl border border-border/25 bg-card/20 backdrop-blur-sm focus:border-border/40 transition-colors"
            />
            {isApiKeyEmpty() ? (
              <Button
                onClick={() => {
                  const apiKeyVar = findKeyAndValue("api_key");
                  if (!apiKeyVar || !selectedAIProvider || isApiKeyEmpty()) return;
                  onSetSelectedAIProvider({
                    ...selectedAIProvider,
                    variables: {
                      ...selectedAIProvider.variables,
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
                  if (!apiKeyVar || !selectedAIProvider) return;
                  onSetSelectedAIProvider({
                    ...selectedAIProvider,
                    variables: {
                      ...selectedAIProvider.variables,
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
      )}

      {/* Model input */}
      {variables
        .filter((variable) => variable.key === "model")
        .map((variable) => {
          const getVariableValue = () => {
            if (!variable?.key || !selectedAIProvider?.variables) return "";
            return selectedAIProvider.variables[variable.key] || "";
          };

          return (
            <div className="space-y-2 pt-2 border-t border-border/10" key={variable?.key}>
              <div>
                <h3 className="text-sm font-semibold text-foreground/95 tracking-wide">
                  {t("dev_model")}
                </h3>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {t("dev_model_desc").replace("{provider}", selectedProviderName)}
                </p>
              </div>
              <TextInput
                placeholder={t("dev_model_placeholder")}
                value={getVariableValue()}
                onChange={(value) => {
                  if (!variable?.key || !selectedAIProvider) return;
                  onSetSelectedAIProvider({
                    ...selectedAIProvider,
                    variables: {
                      ...selectedAIProvider.variables,
                      [variable.key]: value,
                    },
                  });
                }}
              />
            </div>
          );
        })}
    </div>
  );
};
