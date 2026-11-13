import { Link } from "@tanstack/react-router";
import { capacityBreakdown, type BomLine, type Item } from "@/lib/data";
import { fmt } from "@/components/ui-kit";

export function CapacityBreakdown({ product, bom, items }: { product: Item; bom: BomLine[]; items: Item[] }) {
  const rows = capacityBreakdown(product.id, bom, items);
  if (!rows.length) return null;
  const maximum = Math.min(...rows.map((row) => row.maxUnits));
  return (
    <details className="pb-4">
      <summary className="cursor-pointer py-3 text-sm font-semibold text-primary">Parts & stock breakdown · {fmt(maximum)} can be made</summary>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Manufacturing capacity by part for {product.name}</caption>
          <thead className="border-b bg-muted"><tr><th className="p-2">Part</th><th className="p-2 text-right">Per product</th><th className="p-2 text-right">Stock</th><th className="p-2 text-right">Reserved</th><th className="p-2 text-right">Free stock</th><th className="p-2 text-right">Can make</th></tr></thead>
          <tbody className="divide-y">{rows.map((row) => (
            <tr key={row.componentId} className={row.limiting ? "bg-warning/10" : ""}>
              <td className="min-w-36 p-2">{row.component ? <Link to="/inventory/$id" params={{ id: row.componentId }} className="font-semibold hover:underline">{row.component.name}</Link> : "Missing inventory part"}{row.limiting && <span className="block text-xs font-bold text-warning">Limiting part</span>}{!row.valid && <span className="block text-xs text-destructive">Check BOM quantity</span>}</td>
              <td className="p-2 text-right">{fmt(row.perProduct)}<span className="block text-xs text-muted-foreground">{row.component?.unit}</span></td>
              <td className="p-2 text-right">{fmt(row.stock)}</td><td className="p-2 text-right">{fmt(row.reserved)}</td><td className="p-2 text-right">{fmt(row.available)}</td>
              <td className="min-w-28 p-2 text-right font-bold">{fmt(row.maxUnits)}<span className="block whitespace-nowrap text-xs font-normal text-muted-foreground">{fmt(row.available)} ÷ {fmt(row.perProduct)}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Maximum: {fmt(maximum)} products — the smallest whole-number result across all parts.</p>
    </details>
  );
}