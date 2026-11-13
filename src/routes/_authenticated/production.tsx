import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardCopy } from "lucide-react";
import { PageHeader, DemoBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useItems, useBom, useProduced, capacity, productionTargetPlan, lowStockReorder } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/production")({
  head: () => ({ meta: [{ title: "Production — HIMGIRI Warehouse" }, { name: "description", content: "Review production capacity by HIMGIRI ladder model." }, { property: "og:title", content: "Production — HIMGIRI Warehouse" }, { property: "og:description", content: "Review production capacity by HIMGIRI ladder model." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Production,
});

function Production() {
  const { t } = useI18n();
  const { data: items = [] } = useItems();
  const { data: bom = [] } = useBom();
  const { data: produced = {} } = useProduced();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [targetText, setTargetText] = useState("10");
  const products = items.filter((i) => bom.some((b) => b.parent_id === i.id));
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0] ?? null;
  const target = Number(targetText);
  const plan = selectedProduct ? productionTargetPlan(selectedProduct.id, target, bom, items) : [];
  const lowStock = lowStockReorder(items);

  const copyReorderList = async () => {
    const lines = lowStock.map(({ item, suggested }) => `${suggested} ${item.unit} ${item.sku} — ${item.name}`);
    try {
      await navigator.clipboard.writeText(lines.length ? `Reorder list\n${lines.join("\n")}` : "No items at or below minimum stock.");
      toast.success("Reorder list copied");
    } catch {
      toast.error("Could not copy the reorder list");
    }
  };

  return (
    <div>
      <PageHeader title={t("production")} subtitle="Capacity is calculated from the limiting BOM component." />
      <section className="mb-6 border-y bg-card px-4 py-5 sm:px-6">
        <h2 className="text-xl font-bold">Production target &amp; parts shortage</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <label className="space-y-1 text-sm font-semibold">
            Product
            <select aria-label="Product for production target" className="h-12 w-full rounded-md border bg-background px-3" value={selectedProduct?.id ?? ""} onChange={(event) => setSelectedProductId(event.target.value)}>
              {products.map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold">
            Target ladders
            <Input aria-label="Target ladders" type="number" min="1" step="1" value={targetText} onChange={(event) => setTargetText(event.target.value)} className="h-12" />
          </label>
        </div>
        {plan.length === 0 ? <p className="mt-4 text-muted-foreground">Choose a product with a parts list and enter a target above zero.</p> : (
          <>
            <div className="mt-4 overflow-x-auto border bg-background">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted"><tr><th className="p-3">Part</th><th className="p-3 text-right">Needed</th><th className="p-3 text-right">Available</th><th className="p-3 text-right">Short</th></tr></thead>
                <tbody className="divide-y">{plan.map((line) => (
                  <tr key={line.componentId}>
                    <td className="p-3">{line.component ? <Link to="/inventory/$id" params={{ id: line.component.id }} className="font-semibold hover:underline">{line.component.sku} — {line.component.name}</Link> : "Missing inventory item"}</td>
                    <td className="p-3 text-right">{line.required}</td>
                    <td className="p-3 text-right">{line.available}</td>
                    <td className={`p-3 text-right font-bold ${line.shortage > 0 ? "text-destructive" : "text-success"}`}>{line.shortage}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Available excludes reserved stock. This is a planning estimate; it does not reserve parts or record production.</p>
          </>
        )}
      </section>

      <section className="mb-6 border-y bg-card px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">Low-stock reorder list</h2><p className="text-sm text-muted-foreground">Items at or below their set minimum level.</p></div>
          <Button variant="outline" onClick={copyReorderList}><ClipboardCopy /> Copy list</Button>
        </div>
        {lowStock.length === 0 ? <p className="mt-4 text-muted-foreground">No items are at or below minimum stock.</p> : (
          <div className="mt-3 divide-y">
            {lowStock.map(({ item, suggested }) => <div key={item.id} className="flex flex-wrap justify-between gap-2 py-3"><Link to="/inventory/$id" params={{ id: item.id }} className="font-semibold hover:underline">{item.sku} — {item.name}</Link><span>{item.available_stock} {item.unit} in stock · {suggested} to reach minimum {item.min_stock}</span></div>)}
          </div>
        )}
      </section>
      <div className="max-w-full overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-left">
          <thead><tr className="border-b bg-muted"><th className="p-3">Product</th><th className="p-3 text-right">Theoretical</th><th className="p-3 text-right">Available-to-promise</th><th className="p-3 text-right">Already produced</th><th className="p-3">Limiting component</th></tr></thead>
          <tbody className="divide-y">
            {products.map((p) => {
              const th = capacity(p.id, bom, items, false);
              const atp = capacity(p.id, bom, items, true);
              return (
                <tr key={p.id}>
                  <td className="p-3"><Link to="/inventory/$id" params={{ id: p.id }} className="font-semibold hover:underline">{p.name}</Link> {bom.some((b) => b.parent_id === p.id && b.unverified) && <DemoBadge label="DEMO BOM" />}</td>
                  <td className="p-3 text-right font-display text-2xl font-black">{th.units}</td>
                  <td className="p-3 text-right font-display text-2xl font-black text-primary">{atp.units}</td>
                  <td className="p-3 text-right font-display text-2xl font-black">{produced[p.id] ?? 0}</td>
                  <td className="p-3">{th.limiting?.name ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-muted-foreground">Theoretical uses all available stock. Available-to-promise excludes reserved stock. Production orders, WIP and quality inspection come in Phase 5.</p>
    </div>
  );
}
