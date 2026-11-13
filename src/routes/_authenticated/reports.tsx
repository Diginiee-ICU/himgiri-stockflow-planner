import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Empty, fmt } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/lib/auth";
import { useItems } from "@/lib/data";
import { downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — HIMGIRI Warehouse" }, { name: "description", content: "Filter and download HIMGIRI stock, usage and loss reports." }, { property: "og:title", content: "Reports — HIMGIRI Warehouse" }, { property: "og:description", content: "Filter and download HIMGIRI stock, usage and loss reports." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Reports,
});

const TYPES = ["opening", "receive", "issue", "transfer", "production_consumption", "production_return", "damage", "scrap", "adjustment"] as const;
const dayStart = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : "");
const dayEnd = (d: string) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : "");
const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-IN") : "");
const today = () => new Date().toISOString().slice(0, 10);

function Reports() {
  const { data: me } = useMe();
  const allowed = !!(me?.isManager || me?.isAuditor);
  const { data: items = [] } = useItems();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("");

  const { data: ledger = [], isFetching } = useQuery({
    queryKey: ["txns", "report", from, to, type], enabled: allowed,
    queryFn: async () => {
      const rows: Array<{ id: number; created_at: string; txn_type: string; quantity: number; balance_after: number; reason: string | null; source: string | null; destination: string | null; reference: string | null; items: { sku: string; name: string; unit: string } | null }> = [];
      for (let page = 0; page < 50; page++) {
        let q = supabase.from("stock_transactions").select("*, items(sku, name, unit)").order("created_at", { ascending: false }).range(page * 1000, page * 1000 + 999);
        if (from) q = q.gte("created_at", dayStart(from));
        if (to) q = q.lte("created_at", dayEnd(to));
        if (type) q = q.eq("txn_type", type as never);
        const { data, error } = await q;
        if (error) throw error;
        rows.push(...(data as typeof rows));
        if (data.length < 1000) break;
      }
      return rows;
    },
  });
  const { data: usage = [] } = useQuery({
    queryKey: ["material_requests", "report", from, to], enabled: allowed,
    queryFn: async () => {
      let q = supabase.from("material_requests").select("*, items(sku, name, unit), profiles!material_requests_requested_by_fkey(full_name, email)").eq("status", "approved").order("decided_at", { ascending: false }).limit(5000);
      if (from) q = q.gte("decided_at", dayStart(from));
      if (to) q = q.lte("decided_at", dayEnd(to));
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Array<{ id: string; quantity: number; note: string | null; decided_at: string | null; items: { sku: string; name: string; unit: string } | null; profiles: { full_name: string | null; email: string | null } | null }>;
    },
  });

  if (!allowed) return <Empty title="Reports are for Admin and Auditor" />;
  const loss = ledger.filter((l) => l.txn_type === "damage" || l.txn_type === "scrap");
  const tag = `${from || "start"}_to_${to || today()}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Filter records and download Excel-ready CSV files." />
      <section className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm font-semibold">From<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-12" /></label>
        <label className="space-y-1 text-sm font-semibold">To<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-12" /></label>
        <label className="space-y-1 text-sm font-semibold">Movement type
          <select className="h-12 w-full rounded-md border bg-background px-3" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All movements</option>
            {TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
          </select>
        </label>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Button size="xl" variant="outline" disabled={isFetching} onClick={() => downloadCsv(`stock-ledger_${tag}.csv`, ["Date", "SKU", "Item", "Type", "Quantity", "Unit", "Balance after", "Reason", "Source", "Destination", "Reference"], ledger.map((l) => [when(l.created_at), l.items?.sku, l.items?.name, l.txn_type, l.quantity, l.items?.unit, l.balance_after, l.reason, l.source, l.destination, l.reference]))}><Download /> Stock ledger ({ledger.length})</Button>
        <Button size="xl" variant="outline" onClick={() => downloadCsv(`stock-summary_${today()}.csv`, ["SKU", "Item", "Type", "Unit", "Available", "Reserved", "Damaged", "Minimum", "Warehouse", "Bin"], items.map((i) => [i.sku, i.name, i.kind, i.unit, i.available_stock, i.reserved_stock, i.damaged_stock, i.min_stock, i.warehouse, i.bin_location]))}><Download /> Current stock ({items.length})</Button>
        <Button size="xl" variant="outline" onClick={() => downloadCsv(`employee-usage_${tag}.csv`, ["Issued on", "Employee", "Email", "SKU", "Item", "Quantity", "Unit", "Purpose"], usage.map((u) => [when(u.decided_at), u.profiles?.full_name, u.profiles?.email, u.items?.sku, u.items?.name, u.quantity, u.items?.unit, u.note]))}><Download /> Employee usage ({usage.length})</Button>
        <Button size="xl" variant="outline" onClick={() => downloadCsv(`scrap-loss_${tag}.csv`, ["Date", "SKU", "Item", "Type", "Quantity", "Unit", "Reason"], loss.map((l) => [when(l.created_at), l.items?.sku, l.items?.name, l.txn_type, l.quantity, l.items?.unit, l.reason]))}><Download /> Scrap &amp; loss ({loss.length})</Button>
      </section>

      <section className="max-w-full overflow-x-auto rounded-lg border bg-card">
        <h2 className="p-4 text-xl font-bold">Stock ledger preview</h2>
        {ledger.length === 0 ? <p className="px-4 pb-4 text-muted-foreground">No movements match these filters.</p> : (
          <table className="w-full text-left text-sm"><tbody className="divide-y">
            {ledger.slice(0, 100).map((l) => <tr key={l.id}><td className="p-2">{when(l.created_at)}</td><td className="p-2 font-semibold">{l.items?.sku}</td><td className="p-2 uppercase">{l.txn_type.replaceAll("_", " ")}</td><td className="p-2 text-right font-bold">{fmt(l.quantity)}</td><td className="p-2 text-right">{fmt(l.balance_after)}</td><td className="p-2">{l.reason}</td></tr>)}
          </tbody></table>
        )}
      </section>
    </div>
  );
}
