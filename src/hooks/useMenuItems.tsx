import {
  Settings,
  Code,
  MessagesSquare,
  AudioLinesIcon,
  SquareSlashIcon,
  MonitorIcon,
  HomeIcon,
  PowerIcon,
  MailIcon,
  MessageSquareTextIcon,
  Layers,
  Eye,
  Settings2,
  UserCog,
  MicIcon,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useApp } from "@/contexts";
import { useTranslation } from "./useTranslation";

export interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  count?: number;
}

export interface MenuGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  items: MenuItem[];
}

export const useMenuItems = () => {
  const { hasActiveLicense } = useApp();
  const { t } = useTranslation();

  const menu: MenuGroup[] = [
    {
      id: "core",
      title: t("sidebar_group_core"),
      icon: Layers,
      items: [
        {
          icon: HomeIcon,
          label: t("sidebar_dashboard"),
          href: "/dashboard",
        },
        {
          icon: MessagesSquare,
          label: t("sidebar_chats"),
          href: "/chats",
        },
        {
          icon: UserCog,
          label: t("sidebar_profiles"),
          href: "/profiles",
        },
      ],
    },
    {
      id: "sensors",
      title: t("sidebar_group_sensors"),
      icon: Eye,
      items: [
        {
          icon: AudioLinesIcon,
          label: t("sidebar_audio"),
          href: "/audio",
        },
        {
          icon: MicIcon,
          label: t("sidebar_voice_agent"),
          href: "/voice-agent",
        },
        {
          icon: MonitorIcon,
          label: t("sidebar_screenshot"),
          href: "/screenshot",
        },
        {
          icon: SquareSlashIcon,
          label: t("sidebar_shortcuts"),
          href: "/shortcuts",
        },
      ],
    },
    {
      id: "engine",
      title: t("sidebar_group_engine"),
      icon: Settings2,
      items: [
        {
          icon: MessageSquareTextIcon,
          label: t("sidebar_responses"),
          href: "/responses",
        },
        {
          icon: Code,
          label: t("sidebar_dev_space"),
          href: "/dev-space",
        },
        {
          icon: Settings,
          label: t("sidebar_app_settings"),
          href: "/settings",
        },
      ],
    },
  ];

  const footerItems = [
    ...(hasActiveLicense
      ? [
          {
            icon: MailIcon,
            label: t("sidebar_support"),
            href: "mailto:support@invisibleai.com",
          },
        ]
      : []),
    {
      icon: PowerIcon,
      label: t("sidebar_quit"),
      action: async () => {
        await invoke("exit_app");
      },
    },
  ];
  return {
    menu,
    footerItems,
  };
};
