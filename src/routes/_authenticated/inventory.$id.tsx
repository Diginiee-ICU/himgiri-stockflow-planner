import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Copy, Trash2, Pencil, Printer, Factory, Plus } from "lucide-react";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stat, DemoBadge, fmt } from "@/components/ui-kit";
import { useI18n } from "@/lib/i18n";
import { useMe, logAction } from "@/lib/auth";
import { useItems, useBom, useCategories, useProduced, capacity, productionPreview } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/inventory/$id")({
  head: () => ({ meta: [{ title: "Item details — HIMGIRI Warehouse" }, { name: "description", content: "View HIMGIRI inventory item stock, bill of materials and history." }, { property: "og:title", content: "Item details — HIMGIRI Warehouse" }, { property: "og:description", content: "View HIMGIRI inventory item stock, bill of materials and history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ItemPage,
});

const ops = [
  ["opening", "Opening stock"], ["receive", "Receive"], ["issue", "Issue"], ["transfer", "Transfer bin"],
  ["production_consumption", "Production use"], ["production_return", "Production return"],
  ["damage", "Damage"], ["scrap", "Scrap"], ["adjustment", "Adjust (+/−)"],
] as const;

function ItemPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { data: me } = useMe();
  const { data: items = [] } = useItems();
  const { data: bom = [] } = useBom();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: cats = [] } = useCategories();
  const { data: produced = {} } = useProduced();
  const [editOpen, setEditOpen] = useState(false);
  const [units, setUnits] = useState("");
  const item = items.find((i) => i.id === id);
  const { data: hist = [] } = useQuery({
    queryKey: ["txns", id],
    queryFn: async () => (await supabase.from("stock_transactions").select("*").eq("item_id", id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const [op, setOp] = useState<(typeof ops)[number][0]>("receive");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState("");
  const [dest, setDest] = useState("");

  const refresh = () => { qc.invalidateQueries({ queryKey: ["items"] }); qc.invalidateQueries({ queryKey: ["txns"] }); qc.invalidateQueries({ queryKey: ["bom"] }); };

  const post = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("post_stock_transaction", {
        _item_id: id, _type: op, _quantity: Number(qty),
        ...(reason ? { _reason: reason } : {}), ...(ref ? { _reference: ref } : {}),
        ...(op === "transfer" && item?.bin_location ? { _source: item.bin_location } : {}), ...(dest ? { _destination: dest } : {}),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Stock updated"); setQty(""); setReason(""); setRef(""); setDest(""); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const build = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("record_production", { _product_id: id, _units: Number(units) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${units} units produced — components deducted`); setUnits(""); refresh(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const lines = bom.filter((b) => b.parent_id === id);
  const usedIn = bom.filter((b) => b.component_id === id);

  if (!item) return <p>Loading…</p>;
  const cap = capacity(id, bom, items, false);
  const atp = capacity(id, bom, items, true);

  async function approve() {
    const { error } = await supabase.from("items").update({ approved: true, is_demo: false }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAction("item_approve", "item", id); toast.success("Approved"); refresh();
  }
  async function duplicate() {
    const { id: _i, created_at: _c, updated_at: _u, categories: _cat, ...rest } = item!;
    const { data, error } = await supabase.from("items").insert({ ...rest, sku: item!.sku + "-COPY", name: item!.name + " (copy)" }).select().single();
    if (error) { toast.error(error.message); return; }
    if (lines.length) await supabase.from("bom_lines").insert(lines.map((l) => ({ parent_id: data.id, component_id: l.component_id, quantity: l.quantity, unverified: l.unverified, note: l.note })));
    await logAction("item_duplicate", "item", data.id, { from: id }); refresh();
    navigate({ to: "/inventory/$id", params: { id: data.id } });
  }
  async function remove() {
    if (!confirm("Delete this item and its BOM? Items with stock history cannot be deleted.")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) { toast.error("Cannot delete: " + error.message); return; }
    await logAction("item_delete", "item", id, { sku: item!.sku }); refresh(); navigate({ to: "/inventory" });
  }

  return (
    <div className="space-y-6">
      <Link to="/inventory" className="inline-flex min-h-12 items-center gap-2 font-semibold"><ArrowLeft /> {t("back")}</Link>
      <div className="flex flex-col gap-6 rounded-lg border bg-card p-5 md:flex-row">
        {item.image_url ? <img src={item.image_url} alt={item.name} className="h-56 w-full rounded bg-muted object-contain md:w-56" /> : <div className="grid h-40 place-items-center rounded bg-muted md:w-56">No photo</div>}
        <div className="flex-1 space-y-2">
          <div className="text-sm font-bold text-muted-foreground">{item.sku} · {item.sourcing} · {item.kind.replace("_", " ")}</div>
          <h1 className="text-3xl font-black">{item.name}</h1>
          <div className="flex flex-wrap gap-2">{item.is_demo && <DemoBadge />}{!item.approved && <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold">Not approved</span>}</div>
          {item.description && <p>{item.description}</p>}
          {item.specifications && <p className="text-muted-foreground">{item.specifications}</p>}
          <p><b>{t("location")}:</b> {[item.warehouse, item.bin_location].filter(Boolean).join(" / ") || "—"}</p>
          {me?.isManager && (
            <div className="flex flex-wrap gap-2 pt-2">
              {!item.approved && <Button onClick={approve}><CheckCircle2 /> Approve</Button>}
              <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil /> Edit</Button>
              <Button variant="outline" asChild><Link to="/labels" search={{ item: id }}><Printer /> Print label</Link></Button>
              <Button variant="outline" onClick={duplicate}><Copy /> Duplicate</Button>
              <Button variant="outline" onClick={remove}><Trash2 /> Delete</Button>
            </div>
          )}
        </div>
      </div>

      {me?.isManager && <ItemFormDialog open={editOpen} onOpenChange={setEditOpen} cats={cats} item={item} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("available")} value={`${fmt(item.available_stock)}`} tone="primary" />
        <Stat label={t("reserved")} value={fmt(item.reserved_stock)} />
        <Stat label={t("damaged")} value={fmt(item.damaged_stock)} />
        <Stat label={t("minimum")} value={fmt(item.min_stock)} />
      </div>

      {me?.isManager ? (
        <section className="rounded-lg border-2 border-primary bg-card p-5">
          <h2 className="mb-3 text-xl font-bold">{t("stockAction")}</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {ops.map(([k, l]) => <Button key={k} variant={op === k ? "default" : "outline"} onClick={() => setOp(k)}>{l}</Button>)}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1"><Label>Quantity ({item.unit}){op === "adjustment" && " — use minus for reduction"}</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="h-14 text-xl" /></div>
            <div className="space-y-1"><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-14" /></div>
            <div className="space-y-1"><Label>Reference (PO / challan)</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} className="h-14" /></div>
            {(op === "transfer" || op === "issue") && <div className="space-y-1"><Label>{op === "transfer" ? "New bin" : "Issued to"}</Label><Input value={dest} onChange={(e) => setDest(e.target.value)} className="h-14" /></div>}
          </div>
          <Button size="xl" className="mt-4 w-full md:w-auto" disabled={!qty || post.isPending} onClick={() => post.mutate()}>Confirm {ops.find((o) => o[0] === op)?.[1]}</Button>
        </section>
      ) : (
        <p className="rounded-lg bg-muted p-4 font-semibold">{t("readOnly")}</p>
      )}

      {lines.length > 0 && (
        <section className="rounded-lg border-2 border-primary bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Factory /> Production</h2>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Can make now" value={fmt(atp.units)} tone="primary" />
            <Stat label="Already produced" value={fmt(produced[id] ?? 0)} />
            <Stat label="Finished in stock" value={fmt(item.available_stock)} />
          </div>
          {cap.limiting && <p className="mt-2 text-sm text-muted-foreground">Limited by: <b>{cap.limiting.name}</b></p>}
          {me?.isManager && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1"><Label>Units built</Label><Input type="number" min={1} value={units} onChange={(e) => setUnits(e.target.value)} className="h-14 w-36 text-xl" /></div>
                <Button size="xl" disabled={!units || Number(units) <= 0 || build.isPending || productionPreview(id, Number(units) || 0, bom, items).some((p) => p.short)} onClick={() => build.mutate()}>Record production</Button>
              </div>
              {Number(units) > 0 && (
                <div className="rounded-lg border bg-background">
                  <p className="border-b px-3 py-2 text-sm font-bold">Stock after producing {units} {units === "1" ? "ladder" : "ladders"}:</p>
                  <ul className="divide-y text-sm">
                    {productionPreview(id, Number(units), bom, items).map((p) => (
                      <li key={p.component?.id ?? p.need} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span>{p.component?.name ?? "Unknown"} <span className="text-muted-foreground">(needs {fmt(p.need)})</span></span>
                        <b className={p.short ? "text-destructive" : ""}>{fmt(p.have)} → {fmt(p.after)}{p.short && " — not enough!"}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Deducts every BOM component from stock and adds the finished units.</p>
            </div>
          )}
        </section>
      )}

      {(lines.length > 0 || item.kind === "finished" || item.kind === "assembly") && (
        <BomEditor parentId={id} cats={cats} lines={lines} items={items} canEdit={!!me?.isManager} cap={cap.units} atp={atp.units} limiting={cap.limiting?.name} onChange={refresh} />
      )}

      {usedIn.length > 0 && (
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-2 text-xl font-bold">Used in</h2>
          <ul className="flex flex-wrap gap-2">{usedIn.map((u) => { const p = items.find((i) => i.id === u.parent_id); return p && <li key={u.id}><Link to="/inventory/$id" params={{ id: p.id }} className="inline-block rounded border px-3 py-2 hover:border-primary">{p.name} × {u.quantity}</Link></li>; })}</ul>
        </section>
      )}

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-2 text-xl font-bold">{t("history")}</h2>
        {hist.length === 0 ? <p className="text-muted-foreground">No movements yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Balance</th><th className="p-2">Reason / Ref</th></tr></thead>
            <tbody className="divide-y">{hist.map((h) => <tr key={h.id}><td className="p-2">{new Date(h.created_at).toLocaleString("en-IN")}</td><td className="p-2 uppercase">{h.txn_type.replace("_", " ")}</td><td className="p-2 text-right font-bold">{fmt(h.quantity)}</td><td className="p-2 text-right">{fmt(h.balance_after)}</td><td className="p-2">{[h.reason, h.reference, h.destination].filter(Boolean).join(" · ")}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}

function BomEditor({ parentId, cats, lines, items, canEdit, cap, atp, limiting, onChange }: {
  parentId: string; cats: { id: string; name: string }[]; lines: { id: string; component_id: string; quantity: number; unverified: boolean }[];
  items: { id: string; name: string; sku: string; available_stock: number; unit: string }[]; canEdit: boolean; cap: number; atp: number; limiting?: string | undefined; onChange: () => void;
}) {
  const { t } = useI18n();
  const [comp, setComp] = useState("");
  const [q, setQ] = useState("1");
  const [newOpen, setNewOpen] = useState(false);
  async function add(componentId = comp) {
    const { error } = await supabase.from("bom_lines").insert({ parent_id: parentId, component_id: componentId, quantity: Number(q) || 1 });
    if (error) { toast.error(error.message); return; }
    await logAction("bom_add", "item", parentId, { component: componentId, qty: q }); setComp(""); onChange();
  }
  async function update(lid: string, quantity: number) {
    const { error } = await supabase.from("bom_lines").update({ quantity, unverified: false, note: null }).eq("id", lid);
    if (error) { toast.error(error.message); return; }
    await logAction("bom_update", "bom_line", lid, { quantity }); onChange();
  }
  async function del(lid: string) {
    const { error } = await supabase.from("bom_lines").delete().eq("id", lid);
    if (error) { toast.error(error.message); return; }
    await logAction("bom_delete", "bom_line", lid); onChange();
  }
  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{t("bom")}</h2>
        <div className="flex gap-4 text-sm"><span>Theoretical: <b className="text-lg">{cap}</b></span><span>Available-to-promise: <b className="text-lg">{atp}</b></span>{limiting && <span className="text-muted-foreground">Limited by {limiting}</span>}</div>
      </div>
      <div className="divide-y">
        {lines.map((l) => {
          const c = items.find((i) => i.id === l.component_id);
          return (
            <div key={l.id} className="flex flex-wrap items-center gap-3 py-3">
              <Link to="/inventory/$id" params={{ id: l.component_id }} className="min-w-48 flex-1 font-semibold underline-offset-2 hover:underline">{c?.name} <span className="text-xs text-muted-foreground">({fmt(c?.available_stock)} {c?.unit} in stock)</span></Link>
              {l.unverified && <DemoBadge />}
              {canEdit ? (
                <>
                  <Input type="number" defaultValue={l.quantity} className="h-12 w-24" onBlur={(e) => Number(e.target.value) !== Number(l.quantity) && Number(e.target.value) > 0 && update(l.id, Number(e.target.value))} />
                  {l.unverified && <Button variant="outline" onClick={() => update(l.id, Number(l.quantity))}>Verify</Button>}
                  <Button variant="ghost" onClick={() => del(l.id)} aria-label="Remove"><Trash2 /></Button>
                </>
              ) : <b className="w-16 text-right">× {l.quantity}</b>}
            </div>
          );
        })}
      </div>
      {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          <select className="h-12 min-w-56 flex-1 rounded-md border bg-background px-3" value={comp} onChange={(e) => setComp(e.target.value)}>
            <option value="">Add component…</option>
            {items.filter((i) => i.id !== parentId).map((i) => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
          </select>
          <Input type="number" value={q} onChange={(e) => setQ(e.target.value)} className="h-12 w-24" />
          <Button disabled={!comp} onClick={() => add()}>Add</Button>
          <Button variant="outline" onClick={() => setNewOpen(true)}><Plus /> New component</Button>
          <ItemFormDialog open={newOpen} onOpenChange={setNewOpen} cats={cats} title="New component for this product" onSaved={(nid) => add(nid)} />
        </div>
      )}
    </section>
  );
}
