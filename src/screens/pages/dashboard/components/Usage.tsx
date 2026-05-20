import { Button } from "@/components";
import { DownloadIcon, RefreshCcwIcon } from "lucide-react";

const MONTHLY_REQUEST_LIMIT = 10000;

const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
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
  const usagePercent = Math.min(
    100,
    Math.round((totalRequests / MONTHLY_REQUEST_LIMIT) * 100)
  );

  return (
    <section
      id="usage"
      className="rounded-xl bg-card p-8 shadow-sm shadow-black/5"
    >
      <div className="mb-6 flex justify-between gap-6">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-primary">
            Uso de la cuenta
          </h2>
          <p className="text-sm text-muted-foreground">
            Has usado {usagePercent}% de tu limite mensual.
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-primary">
            {formatNumber(totalRequests)}{" "}
            <span className="font-normal text-muted-foreground">
              / {formatNumber(MONTHLY_REQUEST_LIMIT)}
            </span>
          </div>
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">
            Requests este mes
          </div>
        </div>
      </div>

      <div className="mb-8 h-4 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${usagePercent}%` }}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-muted p-4">
          <div className="text-xs font-medium text-muted-foreground">
            Total Requests
          </div>
          <div className="mt-1 text-xl font-bold text-primary">
            {formatNumber(totalRequests)}
          </div>
        </div>
        <div className="rounded-lg bg-muted p-4">
          <div className="text-xs font-medium text-muted-foreground">
            Total Tokens
          </div>
          <div className="mt-1 text-xl font-bold text-primary">
            {formatNumber(totalTokens)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border-border bg-muted px-6 shadow-none hover:bg-muted/80"
        >
          <RefreshCcwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Ver detalles de uso
        </Button>
        <Button
          variant="ghost"
          className="rounded-lg px-6 text-muted-foreground hover:text-primary"
        >
          <DownloadIcon className="size-4" />
          Descargar reporte
        </Button>
      </div>
    </section>
  );
}
