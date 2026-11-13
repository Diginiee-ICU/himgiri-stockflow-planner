import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Empty, fmt } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/auth";
import { useItems } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/count")({
  head: () => ({ meta: [{ title: "Stock check — HIMGIRI Warehouse" }, { name: "description", content: "Count physical HIMGIRI stock and compare it with system quantities." }, { property: "og:title", content: "Stock check — HIMGIRI Warehouse" }, { property: "og:description", content: "Count physical HIMGIRI stock and compare it with system quantities." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: StockCheck,
});

type Count = {
  id: string; item_id: string; system_qty: number; physical_qty: number; difference: number;
  note: string | null; reviewed_at: string | null; created_at: string;
  items: { name: string; sku: string; unit: string } | null;
  profiles: { full_name: string | null } | null;
};

function StockCheck() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const { data: items = [] } = useItems();
  const qc = useQueryClient();
  const [itemId, setItemId] = useState("");
  const [physical, setPhysical] = useState("");
  const [note, setNote] = useState("");

  const { data: counts = [] } = useQuery({
    queryKey: ["stock_counts"],
    queryFn: async () =>
      ((await supabase.from("stock_counts").select("*, items(name, sku, unit), profiles!stock_counts_counted_by_fkey(full_name)").order("created_at", { ascending: false }).limit(100)).data ?? []) as Count[],
  });

  const item = items.find((i) => i.id === itemId);
  const phys = physical === "" ? null : Number(physical);
  const diff = item && phys !== null ? phys - Number(item.available_stock) : null;

  const refresh = () => { qc.invalidateQueries({ queryKey: ["stock_counts"] }); qc.invalidateQueries({ queryKey: ["items"] }); };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_counts").insert({
        item_id: itemId, system_qty: Number(item!.available_stock), physical_qty: phys!, difference: diff!,
        note: note || null, counted_by: me!.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Count saved"); setItemId(""); setPhysical(""); setNote(""); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const applyFix = useMutation({
    mutationFn: async (c: Count) => {
      const { error } = await supabase.rpc("post_stock_transaction", {
        _item_id: c.item_id, _type: "adjustment", _quantity: c.difference,
        _reason: `Physical count by ${c.profiles?.full_name ?? "staff"}`, _reference: c.id,
      } as never);
      if (error) throw error;
      const { error: e2 } = await supabase.from("stock_counts").update({ reviewed_by: me!.user.id, reviewed_at: new Date().toISOString() }).eq("id", c.id);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Stock corrected to match the physical count"); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const unreviewed = counts.filter((c) => !c.reviewed_at && c.difference !== 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("stockCheck")} subtitle="Count what is really on the shelf — the system shows the difference immediately." />

      <section className="rounded-lg border-2 border-primary bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><ClipboardCheck /> New count</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Item</Label>
            <select className="h-14 w-full rounded-md border bg-background px-3" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Choose item…</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Physical count{item ? ` (${item.unit})` : ""}</Label><Input type="number" min={0} value={physical} onChange={(e) => setPhysical(e.target.value)} className="h-14 text-xl" /></div>
          <div className="space-y-1"><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="h-14" placeholder="Optional" /></div>
        </div>
        {item && phys !== null && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-4 text-center"><div className="text-xs font-bold uppercase text-muted-foreground">System says</div><div className="font-display text-3xl font-black">{fmt(item.available_stock)}</div></div>
            <div className="rounded-lg border p-4 text-center"><div className="text-xs font-bold uppercase text-muted-foreground">You counted</div><div className="font-display text-3xl font-black">{fmt(phys)}</div></div>
            <div className={`rounded-lg border-2 p-4 text-center ${diff! < 0 ? "border-destructive bg-destructive/5" : diff! > 0 ? "border-warning bg-warning/10" : "border-success"}`}>
              <div className="text-xs font-bold uppercase text-muted-foreground">Difference</div>
              <div className={`font-display text-3xl font-black ${diff! < 0 ? "text-destructive" : ""}`}>{diff! > 0 ? "+" : ""}{fmt(diff)}</div>
              {diff! < 0 && <div className="text-xs font-bold text-destructive">Missing — possible loss or theft</div>}
            </div>
          </div>
        )}
        <Button size="xl" className="mt-4 w-full md:w-auto" disabled={!item || phys === null || phys < 0 || save.isPending} onClick={() => save.mutate()}>Save count</Button>
      </section>

      {me?.isManager && unreviewed.length > 0 && (
        <section className="rounded-lg border-2 border-destructive/50 bg-card p-5">
          <h2 className="mb-3 text-xl font-bold">Mismatches to review ({unreviewed.length})</h2>
          <div className="divide-y">
            {unreviewed.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-48 flex-1">
                  <div className="font-bold">{c.items?.name}</div>
                  <div className="text-sm text-muted-foreground">Counted by {c.profiles?.full_name} · {new Date(c.created_at).toLocaleString("en-IN")}{c.note ? ` · ${c.note}` : ""}</div>
                </div>
                <span className="text-sm">System <b>{fmt(c.system_qty)}</b> → counted <b>{fmt(c.physical_qty)}</b></span>
                <b className={c.difference < 0 ? "text-destructive" : ""}>{c.difference > 0 ? "+" : ""}{fmt(c.difference)}</b>
                <Button disabled={applyFix.isPending} onClick={() => applyFix.mutate(c)}><CheckCircle2 /> Correct stock</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-xl font-bold">Recent counts</h2>
        {counts.length === 0 ? <Empty title="No counts yet" /> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Date</th><th className="p-2">Item</th><th className="p-2">Counted by</th><th className="p-2 text-right">System</th><th className="p-2 text-right">Physical</th><th className="p-2 text-right">Diff</th><th className="p-2">Status</th></tr></thead>
            <tbody className="divide-y">
              {counts.map((c) => (
                <tr key={c.id}>
                  <td className="p-2">{new Date(c.created_at).toLocaleString("en-IN")}</td>
                  <td className="p-2 font-semibold">{c.items?.name}</td>
                  <td className="p-2">{c.profiles?.full_name}</td>
                  <td className="p-2 text-right">{fmt(c.system_qty)}</td>
                  <td className="p-2 text-right">{fmt(c.physical_qty)}</td>
                  <td className={`p-2 text-right font-bold ${c.difference < 0 ? "text-destructive" : ""}`}>{c.difference > 0 ? "+" : ""}{fmt(c.difference)}</td>
                  <td className="p-2">{c.difference === 0 ? "Matched" : c.reviewed_at ? "Corrected" : "Open"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
