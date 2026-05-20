import type { ReactNode } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components";
import { useTheme } from "@/contexts";
import { useVersion } from "@/hooks";
import { ExternalLinkIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

interface DashboardShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export const DashboardShell = ({ sidebar, children }: DashboardShellProps) => {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-full w-full min-w-0 overflow-hidden">
        {sidebar}

        <section className="flex min-w-0 flex-1 flex-col bg-background">
          <DashboardTopBar />

          <main className="min-h-0 flex-1 overflow-hidden px-6 lg:px-8">
            <div className="mx-auto flex h-full w-full max-w-[800px] flex-col">
              {children}
            </div>
          </main>

          <DashboardFooter />
        </section>
      </div>
    </div>
  );
};

const DashboardTopBar = () => {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-12 shrink-0 items-center px-4 lg:px-6">
      <div className="h-full flex-1" data-tauri-drag-region={true} />
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              title="Theme"
            >
              {theme === "system" ? (
                <MonitorIcon className="size-4" />
              ) : theme === "light" ? (
                <SunIcon className="size-4" />
              ) : (
                <MoonIcon className="size-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

const DashboardFooter = () => {
  const { version, isLoading } = useVersion();

  return (
    <footer className="flex h-12 shrink-0 items-center justify-between border-t border-border/70 px-6 text-xs text-muted-foreground lg:px-8">
      <span>InvisibleAI {isLoading ? "" : `v${version}`}</span>
      <div className="flex items-center gap-5">
        <a
          href="https://github.com/EDY28-M/invisibleai/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          Help
        </a>
        <a
          href="https://github.com/EDY28-M/invisibleai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          Documentation
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>
    </footer>
  );
};
