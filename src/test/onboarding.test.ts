import { describe, expect, it } from "vitest";
import { onboardingSchema, openingMovements, suggestedProductSchema } from "@/lib/onboarding";

const part = { name: "Step", sku: "STEP-1", unit: "pcs", kind: "component", description: "", image_url: "", opening_stock: 25 };
const product = { name: "Ladder", sku: "LADDER-1", unit: "pcs", kind: "finished", description: "", image_url: "", opening_stock: 3, category_id: "", model: "", variant: "", bom: [{ item_id: null, quantity: 5, part }] };
describe("Product onboarding", () => {
  it("saves the manager-adjusted BOM quantity rather than the original suggestion", () => {
    const suggestion = suggestedProductSchema.parse({ name: "Ladder", description: "", warning: "Verify", parts: [{ name: "Step", description: "", quantity: 4, unit: "pcs", uncertain: true }] });
    const adjusted = onboardingSchema.parse({ ...product, bom: [{ item_id: null, part, quantity: "6" }] });
    expect(suggestion.parts[0]?.quantity).toBe(4);
    expect(adjusted.bom[0]?.quantity).toBe(6);
  });
  it("preserves suggested quantities for exactly one ladder", () => {
    const result = suggestedProductSchema.parse({ name: "5-step ladder", description: "", warning: "Verify physically", parts: [{ name: "Feet", description: "Visible", quantity: 4, unit: "pcs", uncertain: false }, { name: "Steps", description: "Platform separate", quantity: 4, unit: "pcs", uncertain: true }, { name: "Platform", description: "Top", quantity: 1, unit: "pcs", uncertain: false }] });
    expect(result.parts.map(({ quantity }) => quantity)).toEqual([4, 4, 1]);
  });
  it.each([0, -1, Infinity])("rejects invalid AI-suggested per-ladder quantity %s", (quantity) => {
    expect(suggestedProductSchema.safeParse({ name: "Ladder", description: "", warning: "", parts: [{ name: "Foot", description: "", quantity, unit: "pcs", uncertain: true }] }).success).toBe(false);
  });
  it("allows optional product and individual part photos", () => {
    expect(onboardingSchema.parse(product).image_url).toBe("");
    expect(onboardingSchema.parse(product).bom[0]?.part?.image_url).toBe("");
  });
  it("keeps opening finished stock separate from unused part stock", () => {
    expect(openingMovements(onboardingSchema.parse(product))).toEqual([{ name: "Ladder", quantity: 3 }, { name: "Step", quantity: 25 }]);
  });
  it("posts no opening movement for a zero quantity", () => {
    expect(openingMovements(onboardingSchema.parse({ ...product, opening_stock: 0, bom: [{ item_id: null, quantity: 5, part: { ...part, opening_stock: 0 } }] }))).toEqual([]);
  });
  it("rejects negative physical opening stock", () => {
    expect(onboardingSchema.safeParse({ ...product, opening_stock: -1 }).success).toBe(false);
  });
  it("requires a positive per-product BOM quantity", () => {
    expect(onboardingSchema.safeParse({ ...product, bom: [{ item_id: null, quantity: 0, part }] }).success).toBe(false);
  });
  it("does not add opening stock to an existing inventory part", () => {
    expect(openingMovements(onboardingSchema.parse({ ...product, bom: [{ item_id: "10000000-0000-4000-8000-000000000001", quantity: 5, part: null }] }))).toEqual([{ name: "Ladder", quantity: 3 }]);
  });
});