import { useState } from "react";
import stichLogo from "../../logo/stich_logo_transparent.png";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { useMenuItems, useVersion } from "@/hooks";
import { ChevronDown } from "lucide-react";

export const Sidebar = () => {
  const { version, isLoading } = useVersion();
  const { menu, footerItems } = useMenuItems();

  const navigate = useNavigate();
  const activeRoute = useLocation().pathname;
  const isActiveRoute = (href: string) =>
    href === "/dashboard" ? activeRoute === href : activeRoute.startsWith(href);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => ({
    core: localStorage.getItem("sidebar_group_core_expanded") !== "false",
    sensors: localStorage.getItem("sidebar_group_sensors_expanded") !== "false",
    engine: localStorage.getItem("sidebar_group_engine_expanded") !== "false",
  }));

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const nextVal = !prev[id];
      localStorage.setItem(`sidebar_group_${id}_expanded`, String(nextVal));
      return { ...prev, [id]: nextVal };
    });
  };

  return (
    <aside className="flex h-screen w-64 shrink-0 select-none flex-col border-r border-border/40 bg-sidebar/95 pt-8">
      {/* Brand Header */}
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-4 px-6 pb-6 text-left border-b border-border/25"
      >
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl overflow-hidden border border-border/40 bg-background/50">
          <img src={stichLogo} alt="Stich Logo" className="size-10 object-contain" />
        </div>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-lg font-bold leading-tight text-sidebar-foreground">
            InvisibleAI
          </h1>
          <span className="block text-xs leading-tight text-muted-foreground/60 mt-1">
            {isLoading ? "Loading..." : `Core Console v${version}`}
          </span>
        </div>
      </button>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
        {menu.map((group) => (
          <div key={group.id} className="flex flex-col space-y-2">
            {/* Group Header */}
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground/45 transition-colors hover:text-sidebar-foreground/70"
            >
              <span>{group.title}</span>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground/40 transition-transform duration-300",
                  expandedGroups[group.id] ? "rotate-0" : "-rotate-90"
                )}
              />
            </button>

            {/* Accordion Items */}
            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
                expandedGroups[group.id] ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden space-y-1.5 mt-1">
                {group.items.map((item, index) => (
                  <button
                    type="button"
                    onClick={() => navigate(item.href)}
                    key={`${item.label}-${index}`}
                    className={cn(
                      "flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-sm text-sidebar-foreground/75 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActiveRoute(item.href)
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground border-l-2 border-primary/50 rounded-l-none"
                        : ""
                    )}
                  >
                    <item.icon className="size-5 shrink-0 opacity-80" />
                    <span className="text-left leading-tight font-medium flex-1 truncate">{item.label}</span>
                    {item.count ? (
                      <span className="flex min-w-[22px] h-5 items-center justify-center rounded-md bg-muted px-1.5 text-[11px] font-bold text-muted-foreground shrink-0">
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col space-y-1 border-t border-border/25 px-5 py-5 bg-background/5">
        {footerItems.map((item, index) => (
          <a
            href={item.href}
            onClick={item.action}
            target="_blank"
            rel="noopener noreferrer"
            key={`${item.label}-${index}`}
            className={cn(
              "flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-sm text-sidebar-foreground/60 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="size-5 shrink-0 transition-all duration-300" />
            <span className="text-left leading-tight font-medium flex-1">{item.label}</span>
          </a>
        ))}
      </div>
    </aside>
  );
};
