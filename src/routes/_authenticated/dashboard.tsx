import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Stat, Empty, DemoBadge, fmt } from "@/components/ui-kit";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/auth";
import { useItems, useBom, useProduced, capacity } from "@/lib/data";
import { CapacityBreakdown } from "@/components/CapacityBreakdown";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — HIMGIRI Warehouse" }, { name: "description", content: "HIMGIRI inventory, stock and production overview." }, { property: "og:title", content: "Dashboard — HIMGIRI Warehouse" }, { property: "og:description", content: "HIMGIRI inventory, stock and production overview." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const itemQuery = useItems();
  const bomQuery = useBom();
  const items = itemQuery.data ?? [];
  const bom = bomQuery.data ?? [];
  const queryClient = useQueryClient();
  const { data: produced = {} } = useProduced();
  const { data: txns = [] } = useQuery({
    queryKey: ["txns", "recent"],
    queryFn: async () => (await supabase.from("stock_transactions").select("*, items(name, sku)").order("created_at", { ascending: false }).limit(8)).data ?? [],
  });

  const sum = (k: string) => items.filter((i) => i.kind === k).reduce((a, i) => a + Number(i.available_stock), 0);
  const low = items.filter((i) => Number(i.min_stock) > 0 && Number(i.available_stock) <= Number(i.min_stock));
  const damaged = items.filter((i) => Number(i.damaged_stock) > 0);
  const products = items.filter((i) => i.kind === "finished" || i.kind === "assembly");
  const noStock = items.every((i) => Number(i.available_stock) === 0);

  return (
    <div>
      <PageHeader title={t("dashboard")} subtitle={`Namaste, ${me?.profile?.full_name ?? ""}`} />
      {noStock && me?.isManager && (
        <div className="mb-6 rounded-lg border-l-8 border-primary bg-card p-5">
          <h2 className="text-xl font-bold">Getting started</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-base">
            <li>Review the 5 demo ladder products and replace their DEMO BOMs with real specifications.</li>
            <li>Open each component in Inventory and enter verified <b>opening stock</b>.</li>
            <li>Invite your employees from the Employees page.</li>
          </ol>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={t("totalItems")} value={fmt(items.length)} />
        <Stat label={t("rawStock")} value={fmt(sum("raw_material"))} />
        <Stat label={t("componentStock")} value={fmt(sum("component"))} />
        <Stat label={t("assemblyStock")} value={fmt(sum("assembly"))} />
        <Stat label={t("finishedStock")} value={fmt(sum("finished"))} tone="primary" />
      </div>

      <section className="mt-6 border-y py-5" aria-labelledby="manufacturing-capacity">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="manufacturing-capacity" className="text-xl font-bold">Products you can manufacture now</h2>
            <Button variant="outline" size="icon" aria-label="Refresh manufacturing capacity" title="Refresh stock and BOM" disabled={itemQuery.isFetching || bomQuery.isFetching} onClick={() => Promise.all([queryClient.invalidateQueries({ queryKey: ["items"] }), queryClient.invalidateQueries({ queryKey: ["bom"] })])}><RefreshCw className={itemQuery.isFetching || bomQuery.isFetching ? "animate-spin" : ""} /></Button>
          </div>
          {itemQuery.isPending || bomQuery.isPending ? <p role="status" className="py-4 text-muted-foreground">Checking stock and parts lists…</p> : itemQuery.isError || bomQuery.isError ? <p role="alert" className="py-4 text-destructive">Stock or parts lists could not be loaded. Refresh to try again.</p> : products.length === 0 ? <Empty title="No products yet" /> : <div className="grid gap-x-8 md:grid-cols-2">
            {products.map((l) => {
              const c = capacity(l.id, bom, items, true);
              const unverified = bom.some((line) => line.parent_id === l.id && line.unverified);
              return (
                <div key={l.id} className="min-w-0 border-b">
                <Link to="/inventory/$id" params={{ id: l.id }} className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-3 py-4 hover:bg-muted/40">
                  {l.image_url ? <img src={l.image_url} alt={l.name} className="h-20 w-16 rounded bg-muted object-contain" /> : <div className="grid h-20 w-16 place-items-center rounded bg-muted text-xs text-muted-foreground">No photo</div>}
                  <div className="min-w-0">
                    <div className="break-words font-semibold">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.sku}</div>
                    <div className="mt-1 break-words text-sm text-muted-foreground">{c.lines === 0 ? "No BOM added" : c.limiting ? `Limiting part: ${c.limiting.name}` : "BOM part missing from inventory"} {l.is_demo && <DemoBadge />}</div>
                    {unverified && <p className="mt-1 text-xs font-semibold text-warning">Draft BOM · quantities need verification</p>}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div><div className="text-xs font-bold text-muted-foreground">Can make now</div><div className="font-display text-2xl font-black text-primary">{c.lines ? fmt(c.units) : "—"}</div></div>
                      <div><div className="text-xs font-bold text-muted-foreground">In stock</div><div className="font-display text-2xl font-black">{fmt(l.available_stock)}</div></div>
                      <div><div className="text-xs font-bold text-muted-foreground">Produced</div><div className="font-display text-2xl font-black">{fmt(produced[l.id] ?? 0)}</div></div>
                    </div>
                  </div>
                </Link>
                <CapacityBreakdown product={l} bom={bom} items={items} />
                </div>
              );
            })}
          </div>}
          <p className="mt-4 text-sm text-muted-foreground">Based on unreserved parts for each product separately. Products sharing parts cannot all be made in these quantities at once.</p>
      </section>

      <div className="mt-6">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-3 text-xl font-bold">{t("lowStock")} &amp; discrepancies</h2>
          {low.length === 0 && damaged.length === 0 ? (
            <p className="text-muted-foreground">No low-stock alerts. Set minimum levels on items to get alerts.</p>
          ) : (
            <ul className="divide-y">
              {low.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.name}</span><b className="text-destructive">{fmt(i.available_stock)} / {fmt(i.min_stock)}</b></li>)}
              {damaged.map((i) => <li key={"d" + i.id} className="flex justify-between py-2"><span>{i.name} (damaged)</span><b>{fmt(i.damaged_stock)}</b></li>)}
            </ul>
          )}
          <p className="mt-4 text-sm text-muted-foreground">Pending production orders: 0 — production orders arrive in Phase 5.</p>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">{t("recent")}</h2>
        {txns.length === 0 ? <Empty title="No stock movements yet">Admin can record opening stock from any item page.</Empty> : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left">
              <tbody className="divide-y">
                {txns.map((x) => (
                  <tr key={x.id}><td className="p-3 text-sm text-muted-foreground">{new Date(x.created_at).toLocaleString("en-IN")}</td><td className="p-3 font-semibold">{x.items?.name}</td><td className="p-3 uppercase">{x.txn_type.replace("_", " ")}</td><td className="p-3 text-right font-bold">{fmt(x.quantity)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
