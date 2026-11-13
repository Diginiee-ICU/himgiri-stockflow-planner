import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWebsiteLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: manager, error: roleError } = await context.supabase.rpc("is_manager", { _user_id: context.userId });
    if (roleError || !manager) throw new Error("Only managers can view website leads");
    const { data, error } = await context.supabase.from("website_leads").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("Website leads could not be loaded");
    return { leads: data, configured: Boolean(process.env["WEBSITE_LEADS_SIGNING_SECRET"]), website: "https://himgiriladders.in" };
  });