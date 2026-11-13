import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { resolveInventoryImages } from "./inventory-images";

export type Item = Database["public"]["Tables"]["items"]["Row"];
export type BomLine = Database["public"]["Tables"]["bom_lines"]["Row"];

export function useItems() {
  return useQuery({
    queryKey: ["items"],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*, categories(name, name_hi)").order("sku");
      if (error) throw error;
      return resolveInventoryImages(data);
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort");
      if (error) throw error;
      return data;
    },
  });
}

export function useBom() {
  return useQuery({
    queryKey: ["bom"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bom_lines").select("*");
      if (error) throw error;
      return data;
    },
  });
}

/** Max buildable units using the limiting BOM component (one level). */
export function capacity(parentId: string, bom: BomLine[], items: Item[], useFree = true) {
  const lines = capacityBreakdown(parentId, bom, items, useFree);
  if (!lines.length) return { units: 0, limiting: null as Item | null, lines: 0 };
  let units = Infinity;
  let limiting: Item | null = null;
  for (const l of lines) {
    if (l.maxUnits < units) { units = l.maxUnits; limiting = l.component; }
  }
  return { units: units === Infinity ? 0 : units, limiting, lines: lines.length };
}

/** Combine repeated part requirements before dividing unreserved stock by usage. */
export function capacityBreakdown(parentId: string, bom: BomLine[], items: Item[], useFree = true) {
  const requirements = new Map<string, number>();
  for (const line of bom.filter((entry) => entry.parent_id === parentId)) {
    requirements.set(line.component_id, (requirements.get(line.component_id) ?? 0) + Number(line.quantity));
  }
  const rows = [...requirements].map(([componentId, perProduct]) => {
    const component = items.find((item) => item.id === componentId) ?? null;
    const stock = Number(component?.available_stock ?? 0);
    const reserved = Number(component?.reserved_stock ?? 0);
    const available = Math.max(0, stock - (useFree ? reserved : 0));
    const valid = Number.isFinite(perProduct) && perProduct > 0 && Number.isFinite(available);
    return { componentId, component, perProduct, stock, reserved, available, valid, maxUnits: valid ? Math.floor(available / perProduct) : 0 };
  });
  const minimum = rows.length ? Math.min(...rows.map((row) => row.maxUnits)) : 0;
  return rows.map((row) => ({ ...row, limiting: row.maxUnits === minimum, remaining: row.valid ? row.available - minimum * row.perProduct : 0 }));
}

/** Per-component stock after producing `units` of a product; flags any component that would run short. */
export function productionPreview(parentId: string, units: number, bom: BomLine[], items: Item[]) {
  return bom
    .filter((b) => b.parent_id === parentId)
    .map((l) => {
      const c = items.find((i) => i.id === l.component_id);
      const need = Number(l.quantity) * units;
      const have = c ? Number(c.available_stock) : 0;
      return { component: c ?? null, need, have, after: have - need, short: have < need };
    });
}

/** Per-part materials needed for a proposed production target, excluding reserved stock. */
export function productionTargetPlan(parentId: string, target: number, bom: BomLine[], items: Item[]) {
  if (!Number.isFinite(target) || target <= 0) return [];
  const requirements = new Map<string, number>();
  for (const line of bom.filter((entry) => entry.parent_id === parentId)) {
    const quantity = Number(line.quantity);
    if (Number.isFinite(quantity) && quantity > 0) {
      requirements.set(line.component_id, (requirements.get(line.component_id) ?? 0) + quantity * target);
    }
  }
  return [...requirements.entries()].map(([componentId, required]) => {
    const component = items.find((item) => item.id === componentId) ?? null;
    const available = component ? Math.max(0, Number(component.available_stock) - Number(component.reserved_stock)) : 0;
    const shortage = Math.max(0, required - available);
    return { component, componentId, required, available, shortage, after: available - required };
  });
}

/** Items at or below their configured minimum, with the quantity needed to restore that level. */
export function lowStockReorder(items: Item[]) {
  return items
    .filter((item) => Number(item.min_stock) > 0 && Number(item.available_stock) <= Number(item.min_stock))
    .map((item) => ({ item, suggested: Math.max(0, Number(item.min_stock) - Number(item.available_stock)) }));
}

/** Units produced per product, from the ledger (receipts posted by record_production). */
export function useProduced() {
  return useQuery({
    queryKey: ["txns", "produced"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_transactions").select("item_id, quantity").eq("txn_type", "receive").eq("source", "production");
      if (error) throw error;
      const m: Record<string, number> = {};
      for (const r of data) m[r.item_id] = (m[r.item_id] ?? 0) + Number(r.quantity);
      return m;
    },
  });
}
