import { describe, expect, it } from "vitest";
import { capacity, capacityBreakdown, lowStockReorder, productionPreview, productionTargetPlan } from "@/lib/data";
import type { Item, BomLine } from "@/lib/data";

const item = (id: string, stock: number) => ({ id, name: id, available_stock: stock, reserved_stock: 0 }) as Item;
const line = (parent: string, comp: string, qty: number) => ({ parent_id: parent, component_id: comp, quantity: qty }) as BomLine;

describe("dashboard manufacturing capacity", () => {
  it("shows 100 units divided by four parts per ladder as a 25-ladder limit", () => {
    const rows = capacityBreakdown("L", [line("L", "steps", 4), line("L", "handle", 1)], [item("steps", 100), item("handle", 100)]);
    expect(rows[0]).toMatchObject({ perProduct: 4, available: 100, maxUnits: 25, limiting: true, remaining: 0 });
    expect(rows[1]).toMatchObject({ maxUnits: 100, limiting: false, remaining: 75 });
  });
  it("shows reservations separately and marks every tied limiting part", () => {
    const rows = capacityBreakdown("L", [line("L", "feet", 4), line("L", "steps", 4)], [{ ...item("feet", 100), reserved_stock: 20 }, item("steps", 80)]);
    expect(rows.map((row) => [row.available, row.maxUnits, row.limiting])).toEqual([[80, 20, true], [80, 20, true]]);
  });
  it("combines repeated BOM part quantities before calculating capacity", () => {
    const bom = [line("L", "steps", 2), line("L", "steps", 2)];
    expect(capacity("L", bom, [item("steps", 100)]).units).toBe(25);
  });
  it("fails closed for invalid part quantities", () => {
    expect(capacityBreakdown("L", [line("L", "steps", 0)], [item("steps", 100)])[0]?.maxUnits).toBe(0);
  });
  it("uses the limiting BOM part and rounds down to whole products", () => {
    const result = capacity("L", [line("L", "steps", 4), line("L", "feet", 4)], [item("steps", 21), item("feet", 12)]);
    expect(result.units).toBe(3);
    expect(result.limiting?.id).toBe("feet");
  });
  it("excludes reserved parts from what can be manufactured", () => {
    expect(capacity("L", [line("L", "steps", 4)], [{ ...item("steps", 20), reserved_stock: 8 }]).units).toBe(3);
  });
  it("calculates each product against its own BOM", () => {
    const bom = [line("L", "steps", 4), line("A", "steps", 2)];
    expect([capacity("L", bom, [item("steps", 20)]).units, capacity("A", bom, [item("steps", 20)]).units]).toEqual([5, 10]);
  });
  it("cannot manufacture when a required part is missing", () => {
    expect(capacity("L", [line("L", "steps", 4)], []).units).toBe(0);
  });
  it("does not calculate capacity without a BOM", () => {
    expect(capacity("L", [], [item("steps", 20)])).toMatchObject({ units: 0, lines: 0 });
  });
});

describe("productionPreview", () => {
  const bom = [line("L", "steps", 5), line("L", "rivets", 8)];
  const items = [item("steps", 20), item("rivets", 100)];

  it("shows the exact stock left after producing the entered units", () => {
    const p = productionPreview("L", 3, bom, items);
    expect(p.find((x) => x.component?.id === "steps")).toMatchObject({ need: 15, after: 5, short: false });
    expect(p.find((x) => x.component?.id === "rivets")).toMatchObject({ need: 24, after: 76, short: false });
  });

  it("flags a component that would run short so production cannot be recorded", () => {
    const p = productionPreview("L", 5, bom, items);
    expect(p.find((x) => x.component?.id === "steps")?.short).toBe(true);
    expect(p.find((x) => x.component?.id === "steps")?.after).toBe(-5);
  });
});

describe("production target planning", () => {
  it("calculates target shortages from stock after reservations", () => {
    const parts = [
      { ...item("steps", 20), reserved_stock: 4 },
      item("rivets", 100),
    ];
    const plan = productionTargetPlan("L", 4, [line("L", "steps", 5), line("L", "rivets", 8)], parts);
    expect(plan.find((entry) => entry.component?.id === "steps")).toMatchObject({ required: 20, available: 16, shortage: 4, after: -4 });
    expect(plan.find((entry) => entry.component?.id === "rivets")).toMatchObject({ required: 32, available: 100, shortage: 0, after: 68 });
  });

  it("suggests enough reorder quantity to restore the configured minimum", () => {
    const rows = lowStockReorder([
      { ...item("below", 7), min_stock: 10 },
      { ...item("equal", 10), min_stock: 10 },
      { ...item("healthy", 11), min_stock: 10 },
      { ...item("unset", 0), min_stock: 0 },
    ]);
    expect(rows.map(({ item: row, suggested }) => [row.id, suggested])).toEqual([["below", 3], ["equal", 0]]);
  });
});
