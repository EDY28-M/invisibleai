import stichLogo from "../../logo/stich_logo_transparent.png";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { useMenuItems, useVersion } from "@/hooks";

export const Sidebar = () => {
  const { version, isLoading } = useVersion();
  const { menu, footerItems } = useMenuItems();

  const navigate = useNavigate();
  const activeRoute = useLocation().pathname;
  const isActiveRoute = (href: string) =>
    href === "/dashboard" ? activeRoute === href : activeRoute.startsWith(href);

  return (
    <aside className="flex h-screen w-60 shrink-0 select-none flex-col border-r border-border/70 bg-sidebar/95 pt-14">
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-3 px-4 pb-5 text-left"
      >
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg overflow-hidden">
          <img src={stichLogo} alt="Stich Logo" className="size-12 object-contain" />
        </div>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-lg font-semibold leading-tight text-sidebar-foreground transition-all duration-300">
            InvisibleAI
          </h1>
          <span className="block text-[10px] leading-tight text-muted-foreground">
            {isLoading ? "Loading..." : `(v${version})`}
          </span>
        </div>
      </button>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {menu.map((item, index) => (
          <button
            type="button"
            onClick={() => navigate(item.href)}
            key={`${item.label}-${index}`}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActiveRoute(item.href)
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : ""
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <item.icon className="mt-0.5 size-4 shrink-0 transition-all duration-300" />
              <span className="text-left leading-tight break-words">{item.label}</span>
            </div>
            {item.count ? (
              <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground shrink-0">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col space-y-1 border-t border-border/70 px-3 py-3">
        {footerItems.map((item, index) => (
          <a
            href={item.href}
            onClick={item.action}
            target="_blank"
            rel="noopener noreferrer"
            key={`${item.label}-${index}`}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <item.icon className="size-4 shrink-0 transition-all duration-300" />
              <span className="text-left leading-tight">{item.label}</span>
            </div>
          </a>
        ))}
      </div>
    </aside>
  );
};
