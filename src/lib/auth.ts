import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "super_admin" | "admin" | "warehouse_employee" | "production_employee" | "auditor";

export const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  warehouse_employee: "Warehouse Employee",
  production_employee: "Production Employee",
  auditor: "Auditor",
};

export function requireStaffProfile<T extends { active: boolean }>(profile: T | null): T {
  if (!profile) throw new Error("Your staff record is missing. Please ask your Admin to complete your account setup.");
  return profile;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [{ data: roles, error: rolesError }, { data: profile, error: profileError }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);
      if (rolesError) throw rolesError;
      if (profileError) throw profileError;
      const staffProfile = requireStaffProfile(profile);
      const r = (roles ?? []).map((x) => x.role as Role);
      const active = staffProfile.active;
      return {
        user, profile: staffProfile, roles: r, active,
        isManager: active && (r.includes("super_admin") || r.includes("admin")),
        isSuper: active && r.includes("super_admin"),
        isAuditor: r.includes("auditor"),
      };
    },
  });
}

export async function logAction(action: string, entity: string | null = null, entity_id: string | null = null, details?: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("audit_log").insert({ user_id: user.id, action, entity, entity_id, details: details as never });
}
