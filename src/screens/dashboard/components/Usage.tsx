import { Button } from "@/components";
import { DownloadIcon, RefreshCcwIcon } from "lucide-react";

const MONTHLY_REQUEST_LIMIT = 10000;

const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
};

export function Usage({
  loading,
  onRefresh,
  data,
  totalTokens,
}: {
  data: { date: string; requests: number }[];
  totalTokens: number;
  loading: boolean;
  onRefresh: () => void;
}) {
  const totalRequests = data.reduce((acc, curr) => acc + curr.requests, 0);
  const usagePercent = Math.min(100, Math.round((totalRequests / MONTHLY_REQUEST_LIMIT) * 100));

  return (
    <div className="w-full max-w-5xl mx-auto px-1">
      <div
        id="usage"
        className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden"
      >
        {/* Orbs matching the violet-to-indigo progress bar */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-bold text-foreground/95 tracking-wide">
                Uso de la cuenta
              </h2>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Has usado {usagePercent}% de tu límite mensual.
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold text-foreground/80 tabular-nums">
                {formatNumber(totalRequests)}
                <span className="font-normal text-muted-foreground/50 text-xs ml-1">
                  / {formatNumber(MONTHLY_REQUEST_LIMIT)}
                </span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/40 mt-1">
                Requests este mes
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 overflow-hidden rounded-full bg-foreground/8">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-700"
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/15 bg-card/20 p-4 transition-colors hover:bg-card/35">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/40">
                Total Requests
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground/80 tabular-nums leading-none">
                {formatNumber(totalRequests)}
              </div>
            </div>
            <div className="rounded-2xl border border-border/15 bg-card/20 p-4 transition-colors hover:bg-card/35">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/40">
                Total Tokens
              </div>
              <div className="mt-1 text-2xl font-bold text-foreground/80 tabular-nums leading-none">
                {formatNumber(totalTokens)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/10">
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-xl border-border/20 bg-card/20 px-4 h-9 text-xs hover:bg-card/40 transition-all"
            >
              <RefreshCcwIcon className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Ver detalles de uso
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl px-4 h-9 text-xs text-muted-foreground/60 hover:text-foreground/70"
            >
              <DownloadIcon className="size-3.5 mr-1.5" />
              Descargar reporte
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
