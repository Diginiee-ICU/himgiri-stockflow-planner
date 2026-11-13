import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Empty, fmt } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/auth";
import { useItems } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({ meta: [{ title: "Material requests — HIMGIRI Warehouse" }, { name: "description", content: "Employees request materials, and approved stock issues are recorded by name." }, { property: "og:title", content: "Material requests — HIMGIRI Warehouse" }, { property: "og:description", content: "Employees request materials, and approved stock issues are recorded by name." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Requests,
});

type Req = {
  id: string; item_id: string; quantity: number; note: string | null; status: string;
  requested_by: string; created_at: string;
  items: { name: string; sku: string; unit: string; available_stock: number } | null;
  profiles: { full_name: string | null } | null;
};

function Requests() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const { data: items = [] } = useItems();
  const qc = useQueryClient();
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  const { data: reqs = [] } = useQuery({
    queryKey: ["material_requests"],
    queryFn: async () =>
      ((await supabase.from("material_requests").select("*, items(name, sku, unit, available_stock), profiles!material_requests_requested_by_fkey(full_name)").order("created_at", { ascending: false }).limit(100)).data ?? []) as Req[],
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["material_requests"] }); qc.invalidateQueries({ queryKey: ["items"] }); };

  const ask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("material_requests").insert({ item_id: itemId, quantity: Number(qty), note: note || null, requested_by: me!.user.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Request sent to Admin"); setItemId(""); setQty(""); setNote(""); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const decide = useMutation({
    mutationFn: async ({ r, approve }: { r: Req; approve: boolean }) => {
      if (approve) {
        const name = r.profiles?.full_name ?? "employee";
        const { error } = await supabase.rpc("post_stock_transaction", {
          _item_id: r.item_id, _type: "issue", _quantity: r.quantity,
          _reason: r.note ?? "Material request", _destination: `Issued to ${name}`, _reference: r.id,
        } as never);
        if (error) throw error;
      }
      const { error } = await supabase.from("material_requests").update({ status: approve ? "approved" : "rejected", decided_by: me!.user.id, decided_at: new Date().toISOString() }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.approve ? "Issued and recorded against the employee's name" : "Request rejected"); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const pending = reqs.filter((r) => r.status === "pending");
  const mine = reqs.filter((r) => r.requested_by === me?.user.id);
  const byEmployee = new Map<string, { name: string; lines: Req[] }>();
  for (const r of reqs.filter((x) => x.status === "approved")) {
    const k = r.requested_by;
    if (!byEmployee.has(k)) byEmployee.set(k, { name: r.profiles?.full_name ?? "Unknown", lines: [] });
    byEmployee.get(k)!.lines.push(r);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("requests")} subtitle="Every material taken from the warehouse is recorded against a name." />

      <section className="rounded-lg border-2 border-primary bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Package /> Request material</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Item</Label>
            <select className="h-14 w-full rounded-md border bg-background px-3" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Choose item…</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.sku} — {i.name} ({fmt(i.available_stock)} {i.unit})</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Quantity</Label><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="h-14 text-xl" /></div>
          <div className="space-y-1"><Label>What is it for?</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="h-14" placeholder="e.g. 5-step ladder batch" /></div>
        </div>
        <Button size="xl" className="mt-4 w-full md:w-auto" disabled={!itemId || !qty || Number(qty) <= 0 || ask.isPending} onClick={() => ask.mutate()}>Send request</Button>
      </section>

      {me?.isManager && (
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-3 text-xl font-bold">Waiting for approval ({pending.length})</h2>
          {pending.length === 0 ? <p className="text-muted-foreground">No pending requests.</p> : (
            <div className="divide-y">
              {pending.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-48 flex-1">
                    <div className="font-bold">{r.items?.name} × {fmt(r.quantity)}</div>
                    <div className="text-sm text-muted-foreground">{r.profiles?.full_name} · {new Date(r.created_at).toLocaleString("en-IN")}{r.note ? ` · ${r.note}` : ""}</div>
                  </div>
                  <span className="text-sm">In stock: <b>{fmt(r.items?.available_stock)}</b></span>
                  <Button disabled={decide.isPending || Number(r.items?.available_stock ?? 0) < r.quantity} onClick={() => decide.mutate({ r, approve: true })}><CheckCircle2 /> Approve & issue</Button>
                  <Button variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ r, approve: false })}><XCircle /> Reject</Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {me?.isManager ? (
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-3 text-xl font-bold">Material taken — by employee</h2>
          {byEmployee.size === 0 ? <p className="text-muted-foreground">Nothing issued yet.</p> : (
            <div className="space-y-4">
              {[...byEmployee.values()].map((g) => (
                <div key={g.name}>
                  <h3 className="font-black">{g.name}</h3>
                  <ul className="mt-1 divide-y rounded border">
                    {g.lines.map((r) => (
                      <li key={r.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                        <span>{r.items?.name}{r.note ? ` — ${r.note}` : ""}</span>
                        <b>{fmt(r.quantity)} {r.items?.unit}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-3 text-xl font-bold">My requests</h2>
          {mine.length === 0 ? <Empty title="No requests yet" /> : (
            <ul className="divide-y">
              {mine.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{r.items?.name} × {fmt(r.quantity)}</span>
                  <b className={r.status === "approved" ? "text-success" : r.status === "rejected" ? "text-destructive" : "text-muted-foreground"}>{r.status.toUpperCase()}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
