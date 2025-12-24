import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatUsd, shortenAddress } from "@/lib/format";

type Allocation = {
  strategy: string;
  assets: string;
  tier: number;
  capAssets: string;
  enabled: boolean;
  isSynchronous: boolean;
};

type AllocationsTableProps = {
  allocations: Allocation[];
};

export function AllocationsTable({ allocations }: AllocationsTableProps) {
  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle className="text-sm text-muted">Current allocations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allocations.length === 0 ? (
            <div className="text-sm text-muted">No strategies indexed yet.</div>
          ) : (
            allocations.map((allocation) => (
              <div
                key={allocation.strategy}
                className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surfaceElevated/60 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">{shortenAddress(allocation.strategy)}</div>
                  <div className="text-xs text-muted">Tier {allocation.tier} · Cap {formatUsd(allocation.capAssets)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                  <Badge variant={allocation.enabled ? "accent" : "default"}>
                    {allocation.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant={allocation.isSynchronous ? "accent" : "default"}>
                    {allocation.isSynchronous ? "Sync" : "Async"}
                  </Badge>
                  <div className="text-sm text-text number">{formatNumber(allocation.assets)} USDC</div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
