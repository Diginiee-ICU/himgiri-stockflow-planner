import { z } from "zod";

const quantity = z.coerce.number().finite().min(0);
const identity = { name: z.string().trim().min(2).max(160), sku: z.string().trim().min(2).max(40), unit: z.string().trim().min(1).max(20) };
export const newPartSchema = z.object({
  ...identity, kind: z.enum(["component", "raw_material"]), description: z.string().max(2000),
  image_url: z.string(), opening_stock: quantity,
});
export const onboardingSchema = z.object({
  ...identity, kind: z.enum(["finished", "assembly"]), category_id: z.string(), description: z.string().max(2000),
  model: z.string().max(160), variant: z.string().max(160), image_url: z.string(), opening_stock: quantity,
  bom: z.array(z.object({ item_id: z.string().uuid().nullable(), quantity: z.coerce.number().finite().positive(), part: newPartSchema.nullable() })).min(1)
    .superRefine((rows, ctx) => {
      const seen = new Set<string>();
      rows.forEach((row, index) => {
        if (!row.item_id && !row.part) ctx.addIssue({ code: "custom", path: [index], message: "Select or create a part" });
        const key = row.item_id ?? row.part?.sku.toLowerCase();
        if (key && seen.has(key)) ctx.addIssue({ code: "custom", path: [index], message: "Each part must appear once" });
        if (key) seen.add(key);
      });
    }),
}).superRefine((product, ctx) => {
  if (product.bom.some((row) => row.part?.sku.toLowerCase() === product.sku.toLowerCase()))
    ctx.addIssue({ code: "custom", path: ["sku"], message: "Product and part SKUs must differ" });
});
export type OnboardingPayload = z.infer<typeof onboardingSchema>;
export const suggestedProductSchema = z.object({
  name: z.string(), description: z.string(), warning: z.string(),
  parts: z.array(z.object({ name: z.string(), description: z.string(), quantity: z.number().refine((value) => Number.isFinite(value) && value > 0, "Quantity must be positive and finite"), unit: z.string(), uncertain: z.boolean() }).strict()),
}).strict();
export type SuggestedProduct = z.infer<typeof suggestedProductSchema>;
export function openingMovements(payload: OnboardingPayload) {
  return [{ name: payload.name, quantity: payload.opening_stock }, ...payload.bom.flatMap((row) => row.part ? [{ name: row.part.name, quantity: row.part.opening_stock }] : [])].filter((row) => row.quantity > 0);
}
export function suggestSku(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "PRODUCT";
}