import { createServerFn } from "@tanstack/react-start";
import { adminSetupSchema, setupIsClosed, adminCodeSignInSchema, isSetupAdmin } from "./admin-setup";

export const firstAdminSetup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => adminSetupSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const secret = process.env["FIRST_ADMIN_SETUP_CODE"];
    if (!secret) throw new Error("Administrator setup is not configured yet.");
    const { data: allowed, error: attemptError } = await supabaseAdmin.rpc("check_admin_setup_attempt", { _key: "first-admin" });
    if (attemptError || !allowed) throw new Error("Too many setup attempts. Please wait 15 minutes.");
    const { timingSafeEqual, createHash } = await import("node:crypto");
    if (!timingSafeEqual(createHash("sha256").update(data.setupCode).digest(), createHash("sha256").update(secret).digest())) {
      throw new Error("The private setup code is incorrect.");
    }
    const [{ data: state, error: stateError }, { count, error: roleError }] = await Promise.all([
      supabaseAdmin.from("admin_setup_state").select("completed_at").eq("id", true).maybeSingle(),
      supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).in("role", ["admin", "super_admin"]),
    ]);
    if (stateError || roleError) throw new Error("Unable to check administrator setup. Please try again.");
    if (setupIsClosed(!!state?.completed_at, count ?? 0)) throw new Error("Administrator setup is already complete. Please sign in.");
    let userId: string | undefined;
    let created = false;
    const { data: account, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.fullName },
    });
    if (!createError && account.user) {
      userId = account.user.id;
      created = true;
    } else {
      // Recover an existing fresh-remix signup only after proving its password.
      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env["SUPABASE_URL"];
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
      if (!url || !key) throw new Error("Unable to create the administrator account.");
      const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: existing, error } = await auth.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error || !existing.user) throw new Error("Unable to create the account. For an existing account, enter its current password.");
      userId = existing.user.id;
      await auth.auth.signOut();
    }
    if (!userId) throw new Error("Unable to create the administrator account.");
    const { error } = await supabaseAdmin.rpc("finish_admin_setup", { _user_id: userId, _name: data.fullName });
    if (error) {
      if (created) await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Administrator setup could not finish or has already been completed. Please sign in or try again.");
    }
    return { ok: true };
  });
// Admin-only device sign-in with email + private setup code; returns a one-time token the browser exchanges for a session.
export const adminCodeSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => adminCodeSignInSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fail = "Email or setup code is incorrect.";
    const secret = process.env["FIRST_ADMIN_SETUP_CODE"];
    if (!secret) throw new Error("Administrator setup is not configured yet.");
    const { data: allowed, error: attemptError } = await supabaseAdmin.rpc("check_admin_setup_attempt", { _key: "admin-code-login" });
    if (attemptError || !allowed) throw new Error("Too many attempts. Please wait 15 minutes.");
    const { timingSafeEqual, createHash } = await import("node:crypto");
    if (!timingSafeEqual(createHash("sha256").update(data.setupCode).digest(), createHash("sha256").update(secret).digest())) throw new Error(fail);
    const { data: state } = await supabaseAdmin.from("admin_setup_state").select("admin_user_id").eq("id", true).maybeSingle();
    if (!state?.admin_user_id) throw new Error("Administrator setup is not complete yet. Use First-time setup.");
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("email, active").eq("id", state.admin_user_id).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", state.admin_user_id),
    ]);
    if (!isSetupAdmin(data.email, profile?.email, !!roles?.some((r) => r.role === "super_admin"), !!profile?.active)) throw new Error(fail);
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: data.email });
    if (error || !link.properties?.hashed_token) throw new Error("Unable to sign in. Please try again.");
    return { tokenHash: link.properties.hashed_token };
  });
