import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductOnboardingWizard } from "@/components/ProductOnboardingWizard";
import { useMe } from "@/lib/auth";
import { PageHeader, DemoBadge, fmt } from "@/components/ui-kit";
import { useI18n } from "@/lib/i18n";
import { useItems, useBom, capacity } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — HIMGIRI Warehouse" }, { name: "description", content: "Products, ladders, assemblies and their bills of materials." }, { property: "og:title", content: "Products — HIMGIRI Warehouse" }, { property: "og:description", content: "Products, ladders, assemblies and their bills of materials." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Products,
});

function Products() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: items = [] } = useItems();
  const { data: bom = [] } = useBom();
  const products = items.filter((i) => i.kind === "finished" || i.kind === "assembly");
  return (
    <div>
      <PageHeader title={t("products")} actions={me?.isManager && <Button size="xl" onClick={() => setWizardOpen(true)}><Plus /> New product</Button>} />
      {me?.isManager && <ProductOnboardingWizard open={wizardOpen} onOpenChange={setWizardOpen} />}
      {products.length === 0 && <p className="py-8 text-muted-foreground">No products yet.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => {
          const c = capacity(p.id, bom, items);
          const n = bom.filter((b) => b.parent_id === p.id).length;
          return (
            <Link key={p.id} to="/inventory/$id" params={{ id: p.id }} className="overflow-hidden rounded-lg border bg-card transition hover:border-primary">
              <div className="relative bg-muted">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="h-56 w-full object-contain" loading="lazy" width={768} height={1024} /> : <div className="grid h-56 place-items-center">No photo</div>}
                {p.is_demo && <div className="absolute left-3 top-3"><DemoBadge label="Sample image · DEMO" /></div>}
              </div>
              <div className="p-4">
                <div className="text-xs font-bold text-muted-foreground">{p.sku}</div>
                <h2 className="text-lg font-bold leading-snug">{p.name}</h2>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded bg-muted p-2"><div className="font-display text-2xl font-black">{fmt(p.available_stock)}</div>In stock</div>
                  <div className="rounded bg-primary-soft p-2"><div className="font-display text-2xl font-black">{c.units}</div>Can build</div>
                  <div className="rounded bg-muted p-2"><div className="font-display text-2xl font-black">{n}</div>BOM lines</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
