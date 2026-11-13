import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Empty, DemoBadge, fmt } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/auth";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { useItems, useCategories } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventory — HIMGIRI Warehouse" }, { name: "description", content: "Browse HIMGIRI raw materials, components and finished ladders." }, { property: "og:title", content: "Inventory — HIMGIRI Warehouse" }, { property: "og:description", content: "Browse HIMGIRI raw materials, components and finished ladders." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: InventoryLayout,
});

function InventoryLayout() {
  const match = useMatchRoute();
  if (match({ to: "/inventory/$id" })) return <Outlet />;
  return <Inventory />;
}


function Inventory() {
  const { t, lang } = useI18n();
  const { data: me } = useMe();
  const { data: items = [], isLoading } = useItems();
  const { data: cats = [] } = useCategories();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [open, setOpen] = useState(false);

  const list = items.filter((i) => (!cat || i.category_id === cat) && (i.name + i.sku).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title={t("inventory")} subtitle={me?.isManager ? undefined : t("readOnly")}
        actions={me?.isManager && <Button size="xl" onClick={() => setOpen(true)}><Plus /> New item</Button>} />
      <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 h-14 bg-card text-lg" />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Button className="shrink-0" variant={!cat ? "charcoal" : "outline"} onClick={() => setCat("")}>All</Button>
        {cats.map((c) => <Button className="shrink-0" key={c.id} variant={cat === c.id ? "charcoal" : "outline"} onClick={() => setCat(c.id)}>{lang === "hi" && c.name_hi ? c.name_hi : c.name}</Button>)}
      </div>
      {isLoading ? <p>Loading…</p> : list.length === 0 ? <Empty title="No items found" /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => {
            const low = Number(i.min_stock) > 0 && Number(i.available_stock) <= Number(i.min_stock);
            return (
              <Link key={i.id} to="/inventory/$id" params={{ id: i.id }} className="flex gap-4 rounded-lg border bg-card p-4 transition hover:border-primary">
                {i.image_url ? <img src={i.image_url} alt="" className="size-20 shrink-0 rounded bg-muted object-contain" loading="lazy" /> : <div className="grid size-20 shrink-0 place-items-center rounded bg-muted text-xs text-muted-foreground">No photo</div>}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-muted-foreground">{i.sku}</div>
                  <div className="font-bold leading-snug">{i.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={low ? "font-black text-destructive" : "font-black"}>{fmt(i.available_stock)} {i.unit}</span>
                    {i.is_demo && <DemoBadge label="DEMO" />}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {me?.isManager && <ItemFormDialog open={open} onOpenChange={setOpen} cats={cats} />}
    </div>
  );
}

