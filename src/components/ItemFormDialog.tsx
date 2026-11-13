import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logAction } from "@/lib/auth";
import type { Item } from "@/lib/data";

const itemSchema = z.object({
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(160),
  unit: z.string().trim().min(1).max(20),
  min_stock: z.coerce.number().min(0),
});

const empty = { sku: "", name: "", unit: "pcs", min_stock: "0", category_id: "", kind: "component", sourcing: "BUY", description: "", specifications: "", warehouse: "", bin_location: "", image_url: "", model: "", variant: "" };
type F = typeof empty;

function fromItem(i: Item): F {
  return {
    sku: i.sku, name: i.name, unit: i.unit, min_stock: String(i.min_stock), category_id: i.category_id ?? "", kind: i.kind, sourcing: i.sourcing,
    description: i.description ?? "", specifications: i.specifications ?? "", warehouse: i.warehouse ?? "", bin_location: i.bin_location ?? "",
    image_url: i.image_url ?? "", model: i.model ?? "", variant: i.variant ?? "",
  };
}

export function ItemFormDialog({ open, onOpenChange, cats, item, defaults, title, onSaved }: {
  open: boolean; onOpenChange: (b: boolean) => void; cats: { id: string; name: string }[];
  item?: Item; defaults?: Partial<F>; title?: string; onSaved?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState<F>(empty);
  useEffect(() => { if (open) setF(item ? fromItem(item) : { ...empty, ...defaults }); }, [open, item]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = useMutation({
    mutationFn: async () => {
      const v = itemSchema.parse(f);
      const row = {
        ...v, category_id: f.category_id || null, kind: f.kind as never, sourcing: f.sourcing as never,
        description: f.description || null, specifications: f.specifications || null, warehouse: f.warehouse || null,
        image_url: f.image_url || null, model: f.model || null, variant: f.variant || null,
      };
      if (item) {
        // bin_location changes go through the ledger "Transfer bin" action
        const { error } = await supabase.from("items").update(row).eq("id", item.id);
        if (error) throw error;
        await logAction("item_update", "item", item.id, { sku: v.sku });
        return item.id;
      }
      const { data, error } = await supabase.from("items").insert({ ...row, bin_location: f.bin_location || null }).select().single();
      if (error) throw error;
      await logAction("item_create", "item", data.id, { sku: data.sku });
      return data.id;
    },
    onSuccess: (id) => { toast.success(item ? "Item updated" : "Item created"); qc.invalidateQueries({ queryKey: ["items"] }); onOpenChange(false); onSaved?.(id); },
    onError: (e) => toast.error(e instanceof z.ZodError ? e.errors.map((x) => `${x.path}: ${x.message}`).join(", ") : (e as Error).message),
  });
  const field = (k: keyof F, label: string, type = "text") => (
    <div className="space-y-1"><Label>{label}</Label><Input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="h-12" /></div>
  );
  const sel = (k: keyof F, label: string, opts: [string, string][]) => (
    <div className="space-y-1"><Label>{label}</Label>
      <select className="h-12 w-full rounded-md border bg-background px-3" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select></div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="text-2xl">{title ?? (item ? "Edit item" : "New inventory item")}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("sku", "SKU *")}{field("name", "Name *")}
          {sel("category_id", "Category", [["", "—"], ...cats.map((c) => [c.id, c.name] as [string, string])])}
          {sel("kind", "Type", [["raw_material", "Raw material"], ["component", "Component"], ["assembly", "Assembly"], ["finished", "Finished product"]])}
          {sel("sourcing", "Sourcing", [["MAKE", "MAKE"], ["BUY", "BUY"], ["SUBCONTRACT", "SUBCONTRACT"]])}
          {field("unit", "Unit *")}{field("min_stock", "Minimum stock", "number")}
          {field("model", "Model")}{field("variant", "Variant")}
          {field("warehouse", "Warehouse")}
          {!item && field("bin_location", "Bin location")}
          {field("image_url", "Image URL")}
          {field("description", "Description")}{field("specifications", "Technical specifications")}
        </div>
        <p className="text-sm text-muted-foreground">Stock quantities and bin moves are recorded from the item page so they enter the stock ledger.</p>
        <Button size="xl" onClick={() => m.mutate()} disabled={m.isPending}>{item ? "Save changes" : "Save item"}</Button>
      </DialogContent>
    </Dialog>
  );
}
