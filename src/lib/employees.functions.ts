import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roles = ["super_admin", "admin", "warehouse_employee", "production_employee", "auditor"] as const;

async function assertManager(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_manager", { _user_id: userId });
  if (!data) throw new Error("Only Admin can manage employees");
  const { data: sup } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  return !!sup;
}

export const inviteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ email: z.string().email().max(255), full_name: z.string().trim().min(1).max(100), role: z.enum(roles), redirectTo: z.string().url() }).parse(i))
  .handler(async ({ data, context }) => {
    const isSuper = await assertManager(context.supabase, context.userId);
    if ((data.role === "super_admin" || data.role === "admin") && !isSuper) throw new Error("Only Super Admin can create Admins");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { data: { full_name: data.full_name }, redirectTo: data.redirectTo });
    if (error) throw new Error(error.message);
    const uid = inv.user.id;
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    await supabaseAdmin.from("audit_log").insert({ user_id: context.userId, action: "employee_invite", entity: "user", entity_id: uid, details: { email: data.email, role: data.role } });
    return { ok: true };
  });

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid(), role: z.enum(roles).optional(), active: z.boolean().optional(), resend: z.boolean().optional(), redirectTo: z.string().url().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const isSuper = await assertManager(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You cannot change your own account here");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
    const targetPrivileged = (target ?? []).some((r) => r.role === "super_admin" || r.role === "admin");
    if ((targetPrivileged || data.role === "admin" || data.role === "super_admin") && !isSuper) throw new Error("Only Super Admin can change Admin accounts");
    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    }
    if (data.active !== undefined) {
      await supabaseAdmin.from("profiles").update({ active: data.active }).eq("id", data.userId);
      await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.active ? "none" : "876000h" });
    }
    if (data.resend) {
      const { data: p } = await supabaseAdmin.from("profiles").select("email").eq("id", data.userId).single();
      if (p?.email) await supabaseAdmin.auth.resetPasswordForEmail(p.email, data.redirectTo ? { redirectTo: data.redirectTo } : {});
    }
    await supabaseAdmin.from("audit_log").insert({ user_id: context.userId, action: "employee_update", entity: "user", entity_id: data.userId, details: { role: data.role, active: data.active, resend: data.resend } });
    return { ok: true };
  });
