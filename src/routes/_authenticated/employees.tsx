import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Empty } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe, roleLabels, type Role } from "@/lib/auth";
import { inviteEmployee, updateEmployee } from "@/lib/employees.functions";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employees — HIMGIRI Warehouse" }, { name: "description", content: "Manage employee invitations and roles in HIMGIRI Warehouse." }, { property: "og:title", content: "Employees — HIMGIRI Warehouse" }, { property: "og:description", content: "Manage employee invitations and roles in HIMGIRI Warehouse." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Employees,
});

function Employees() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const invite = useServerFn(inviteEmployee);
  const update = useServerFn(updateEmployee);
  const [f, setF] = useState({ email: "", full_name: "", role: "warehouse_employee" as Role });
  const [busy, setBusy] = useState(false);

  const { data: people = [] } = useQuery({
    queryKey: ["employees"],
    enabled: !!me?.isManager,
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("*")]);
      return (p ?? []).map((x) => ({ ...x, roles: (r ?? []).filter((y) => y.user_id === x.id).map((y) => y.role as Role) }));
    },
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["audit", "recent"],
    enabled: !!me?.isManager,
    queryFn: async () => (await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(30)).data ?? [],
  });

  if (!me?.isManager) return <Empty title="Admins only" />;
  const redirectTo = `${window.location.origin}/set-password`;
  const names = Object.fromEntries(people.map((p) => [p.id, p.full_name ?? p.email]));

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try { await fn(); toast.success(msg); qc.invalidateQueries({ queryKey: ["employees"] }); qc.invalidateQueries({ queryKey: ["audit"] }); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const roleOpts = (Object.keys(roleLabels) as Role[]).filter((r) => me.isSuper || (r !== "admin" && r !== "super_admin"));

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" subtitle="Invite staff by email. They set their own password from the link." />
      <section className="rounded-lg border-2 border-primary bg-card p-5">
        <h2 className="mb-3 text-xl font-bold">Invite employee</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1"><Label>Full name</Label><Input className="h-12" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Email</Label><Input className="h-12" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="space-y-1"><Label>Role</Label>
            <select className="h-12 w-full rounded-md border bg-background px-3" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {roleOpts.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
            </select></div>
          <div className="flex items-end"><Button size="xl" className="w-full" disabled={busy || !f.email} onClick={() => run(() => invite({ data: { ...f, redirectTo } }), "Invitation sent")}>Send invite</Button></div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-left">
          <thead><tr className="border-b bg-muted"><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
          <tbody className="divide-y">
            {people.map((p) => (
              <tr key={p.id}>
                <td className="p-3"><div className="font-semibold">{p.full_name}</div><div className="text-sm text-muted-foreground">{p.email}</div></td>
                <td className="p-3">
                  {p.id === me.user.id ? roleLabels[p.roles[0] ?? "warehouse_employee"] : (
                    <select className="h-11 rounded-md border bg-background px-2" value={p.roles[0]} disabled={busy}
                      onChange={(e) => run(() => update({ data: { userId: p.id, role: e.target.value as Role } }), "Role updated")}>
                      {(Object.keys(roleLabels) as Role[]).map((r) => <option key={r} value={r} disabled={!roleOpts.includes(r)}>{roleLabels[r]}</option>)}
                    </select>
                  )}
                </td>
                <td className="p-3">{p.active ? <span className="font-bold text-success">Active</span> : <span className="font-bold text-destructive">Deactivated</span>}</td>
                <td className="p-3">
                  {p.id !== me.user.id && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" disabled={busy} onClick={() => run(() => update({ data: { userId: p.id, active: !p.active } }), p.active ? "Deactivated" : "Activated")}>{p.active ? "Deactivate" : "Activate"}</Button>
                      <Button variant="outline" disabled={busy} onClick={() => run(() => update({ data: { userId: p.id, resend: true, redirectTo } }), "Reset link sent")}>Reset access</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-xl font-bold">Recent activity</h2>
        <ul className="divide-y text-sm">
          {activity.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span><b>{names[a.user_id ?? ""] ?? "—"}</b> · {a.action.replaceAll("_", " ")}</span><span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("en-IN")}</span></li>)}
        </ul>
      </section>
    </div>
  );
}
