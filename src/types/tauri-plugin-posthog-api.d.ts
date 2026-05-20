declare module "tauri-plugin-posthog-api" {
  type Properties = Record<string, unknown>;

  export const PostHog: {
    capture(event: string, properties?: Properties): Promise<void>;
    identify(distinctId: string, properties?: Properties): Promise<void>;
    alias(alias: string): Promise<void>;
    reset(): Promise<void>;
    getDistinctId(): Promise<string | undefined>;
    isFeatureEnabled(flagKey: string): Promise<boolean>;
    getFeatureFlag(flagKey: string): Promise<string | boolean | undefined>;
    getFeatureFlagPayload(flagKey: string): Promise<unknown>;
    reloadFeatureFlags(): Promise<void>;
    capturePageView(properties?: Properties): Promise<void>;
    initialize(): Promise<void>;
    isInitialized(): boolean;
  };

  export default PostHog;
}
