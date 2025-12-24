import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <Card className="surface-glow animate-rise">
      <CardHeader>
        <CardTitle className="text-sm text-muted">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold number">{value}</div>
        {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
