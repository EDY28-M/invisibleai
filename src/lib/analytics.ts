import { PostHog } from "tauri-plugin-posthog-api";

export const ANALYTICS_EVENTS = {

  APP_STARTED: "app_started",

  GET_LICENSE: "get_license",
} as const;

export const captureEvent = async (
  eventName: string,
  properties?: Record<string, any>
) => {
  try {
    await PostHog.capture(eventName, properties || {});
  } catch (error) {

    console.debug("Analytics event failed:", eventName, error);
  }
};

export const trackAppStart = async (appVersion: string, instanceId: string) => {
  await captureEvent(ANALYTICS_EVENTS.APP_STARTED, {
    app_version: appVersion,
    platform: navigator.platform,
    instance_id: instanceId,
  });
};
