import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string | undefined; actions?: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="mb-2 h-1.5 w-16 stripe-accent" />
        <h1 className="break-words text-3xl font-black lg:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-lg text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "warn" | "primary" }) {
  return (
    <div className={cn("rounded-lg border bg-card p-5", tone === "warn" && "border-destructive/40 bg-destructive/5", tone === "primary" && "border-primary bg-primary-soft")}>
      <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-4xl font-black">{value}</div>
    </div>
  );
}

export function DemoBadge({ label = "DEMO / UNVERIFIED" }: { label?: string }) {
  return <span className="inline-flex items-center rounded border-2 border-warning bg-warning/15 px-2 py-0.5 text-xs font-black uppercase tracking-wider">{label}</span>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-dashed bg-card p-8 text-center">
      <h3 className="text-xl font-bold">{title}</h3>
      {children && <div className="mt-2 text-muted-foreground">{children}</div>}
    </div>
  );
}

export const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-IN");
