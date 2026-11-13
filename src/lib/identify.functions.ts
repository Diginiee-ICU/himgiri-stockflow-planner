import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ image: z.string().startsWith("data:image/").max(8_000_000) });

export type IdentifyResult = { matches: { id: string; sku: string; name: string; confidence: number; reason: string }[]; error?: string };

export const identifyPart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<IdentifyResult> => {
    const { data: items, error } = await context.supabase
      .from("items").select("id, sku, name, kind, description").order("sku");
    if (error || !items?.length) return { matches: [], error: "No inventory items to compare with." };
    const catalog = items.map((i) => `${i.sku} | ${i.name} | ${i.kind}${i.description ? " | " + String(i.description).slice(0, 160) : ""}`).join("\n");
    try {
      const { generateResponse } = await import("@lovable.dev/ai-gateway");
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: "You identify parts of aluminium step ladders from a photo. Pick the best matching items from the inventory list only.",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: `Inventory (SKU | name | type | details):\n${catalog}\n\nReturn JSON with up to 3 best matches, best first. confidence is 0-1. reason is one short sentence. If nothing fits, return an empty list.` },
            { type: "input_image", image_url: data.image, detail: "auto" },
          ],
        }],
        text: { format: { type: "json_schema", name: "matches", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["matches"],
          properties: { matches: { type: "array", items: { type: "object", additionalProperties: false, required: ["sku", "confidence", "reason"],
            properties: { sku: { type: "string" }, confidence: { type: "number" }, reason: { type: "string" } } } } },
        } } },
      });
      const out = (res as { output_text?: string }).output_text
        ?? ((res as { output?: { content?: { type: string; text?: string }[] }[] }).output ?? [])
          .flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text).join("");
      const parsed = JSON.parse(out || "{}") as { matches?: { sku: string; confidence: number; reason: string }[] };
      const matches = (parsed.matches ?? []).flatMap((m) => {
        const it = items.find((i) => i.sku.toLowerCase() === m.sku.toLowerCase());
        return it ? [{ id: it.id, sku: it.sku, name: it.name, confidence: Math.max(0, Math.min(1, m.confidence)), reason: m.reason }] : [];
      });
      return { matches };
    } catch (e) {
      console.error("identifyPart failed", e);
      const code = (e as { code?: string; httpStatus?: number }).httpStatus;
      if (code === 402) return { matches: [], error: "AI credits are used up. Please top up and try again." };
      if (code === 429) return { matches: [], error: "Too many requests right now. Please wait a minute." };
      return { matches: [], error: "Could not identify the photo. Please try again." };
    }
  });
