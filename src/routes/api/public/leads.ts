import { createFileRoute } from "@tanstack/react-router";
import { verifyLeadSignature, websiteLeadSchema } from "@/lib/leads";

export const Route = createFileRoute("/api/public/leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["WEBSITE_LEADS_SIGNING_SECRET"];
        if (!secret) return Response.json({ error: "Lead connection is not configured" }, { status: 503 });
        if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "JSON required" }, { status: 415 });
        // Bound the actual stream, not only the caller-supplied Content-Length.
        const reader = request.body?.getReader();
        if (!reader) return Response.json({ error: "Body required" }, { status: 400 });
        const chunks: Uint8Array[] = [];
        let length = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > 32768) { await reader.cancel(); return Response.json({ error: "Body too large" }, { status: 413 }); }
          chunks.push(value);
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        const body = new TextDecoder().decode(bytes);
        const valid = await verifyLeadSignature(body, request.headers.get("x-lead-timestamp"), request.headers.get("x-lead-signature"), secret);
        if (!valid) return Response.json({ error: "Invalid signature" }, { status: 401 });
        let input: unknown;
        try { input = JSON.parse(body); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
        const parsed = websiteLeadSchema.safeParse(input);
        if (!parsed.success) return Response.json({ error: "Invalid lead fields" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("website_leads").upsert({ ...parsed.data, email: parsed.data.email ?? null, phone: parsed.data.phone ?? null, source: "himgiriladders.in" }, { onConflict: "external_id", ignoreDuplicates: true });
        if (error) return Response.json({ error: "Could not save lead" }, { status: 500 });
        return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});