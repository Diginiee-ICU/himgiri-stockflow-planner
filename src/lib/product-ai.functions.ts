import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SuggestedProduct } from "./onboarding";

export type ProductPhotoResult = { suggestion: SuggestedProduct | null; error?: string; blocked?: boolean };
export const suggestProductFromPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ image: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).max(8_000_000), name: z.string().max(160), productType: z.enum(["ladder", "other"]).default("other") }).parse(input))
  .handler(async ({ data, context }): Promise<ProductPhotoResult> => {
    const { data: manager, error: permissionError } = await context.supabase.rpc("is_manager", { _user_id: context.userId });
    if (permissionError || !manager) throw new Error("Only an active manager can identify new products.");
    const { data: state, error: stateError } = await context.supabase.from("ai_gateway_feature_state").select("access_blocked, denial_message").eq("feature_key", "product-onboarding-ai").maybeSingle();
    if (stateError) return { suggestion: null, error: "Photo identification is not configured yet." };
    if (state?.access_blocked) return { suggestion: null, error: state.denial_message ?? "AI access is paused until access is restored.", blocked: true };
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { suggestion: null, error: "AI photo identification is not configured." };
    try {
      const { analyzeProductPhoto } = await import("./product-ai.server");
      const result = await analyzeProductPhoto(getRequest(), key, data.image, data.name, data.productType);
      if (result.runId) setResponseHeader("X-Lovable-AIG-Run-ID", result.runId);
      return { suggestion: result.suggestion };
    } catch (error) {
      console.error("Product photo identification failed", error);
      const failure = error as { statusCode?: number; message?: string; responseBody?: string };
      let message = failure.message ?? "Photo identification failed. Your entries have been kept.";
      if (failure.responseBody) {
        try { const body = JSON.parse(failure.responseBody); message = body.message ?? body.error?.message ?? message; } catch { /* preserve safe SDK message */ }
      }
      const status = failure.statusCode;
      if (status === 403) {
        await context.supabase.from("ai_gateway_feature_state").upsert({ feature_key: "product-onboarding-ai", access_blocked: true, denial_message: message, denied_at: new Date().toISOString() });
        setResponseStatus(403);
      }
      return { suggestion: null, error: status === 401 ? "AI photo identification needs its connection restored." : message, blocked: status === 403 };
    }
  });