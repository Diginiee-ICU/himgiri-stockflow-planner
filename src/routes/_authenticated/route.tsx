import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Boxes, Package, Factory, QrCode, BarChart3, Users, Settings, LogOut, Menu, ClipboardList, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n, type TKey } from "@/lib/i18n";
import { useMe, roleLabels } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

const nav: { to: string; key: TKey; icon: typeof Boxes; manager?: boolean; auditor?: boolean }[] = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/inventory", key: "inventory", icon: Boxes },
  { to: "/products", key: "products", icon: Package },
  { to: "/production", key: "production", icon: Factory },
  { to: "/requests", key: "requests", icon: ClipboardList },
  { to: "/count", key: "stockCheck", icon: ClipboardCheck },
  { to: "/scan", key: "scan", icon: QrCode },
  { to: "/reports", key: "reports", icon: BarChart3, auditor: true },
  { to: "/leads", key: "leads", icon: Users, manager: true },
  { to: "/employees", key: "employees", icon: Users, manager: true },
  { to: "/settings", key: "settings", icon: Settings },
];

function Shell() {
  const { t } = useI18n();
  const { data: me, isPending, error, refetch } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = nav.filter((n) => (!n.manager || me?.isManager) && (!n.auditor || me?.isManager || me?.isAuditor));

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isPending || error || !me) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <Brand />
        <h1 className="text-2xl font-black">{isPending ? "Checking your account…" : "Unable to load your account"}</h1>
        {error && <>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : "Please try again."}</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </>}
        {!isPending && <Button variant="link" onClick={signOut}>{t("signOut")}</Button>}
      </div>
    );
  }

  if (!me.active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <Brand />
        <h1 className="text-2xl font-black">Your account is deactivated</h1>
        <p className="text-muted-foreground">Please contact your Admin.</p>
        <Button variant="link" onClick={signOut}>{t("signOut")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="print:hidden hidden w-64 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <div className="px-2 py-3"><Brand /></div>
        <div className="my-3 h-1.5 stripe-accent" />
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((n) => (
            <Link key={n.to} to={n.to} className="flex min-h-14 items-center gap-3 rounded-md px-4 text-lg font-semibold hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}>
              <n.icon className="size-6" /> {t(n.key)}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border pt-3">
          <div className="truncate px-2 text-sm font-semibold">{me?.profile?.full_name}</div>
          <div className="px-2 text-xs opacity-70">{me?.roles.map((r) => roleLabels[r]).join(", ")}</div>
          <Button variant="ghost" onClick={signOut} className="mt-2 min-h-12 w-full justify-start px-4 hover:bg-sidebar-accent"><LogOut className="size-5" /> {t("signOut")}</Button>
        </div>
      </aside>

      <header className="mobile-safe-header print:hidden sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-charcoal px-4 py-3 text-charcoal-foreground lg:hidden">
        <Brand />
        <Button variant="charcoal" onClick={() => setMenuOpen(true)} aria-label={t("menu")} className="shrink-0 bg-sidebar-accent px-3"><Menu className="size-6" /> {t("menu")}</Button>
      </header>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-xl font-black">{t("menu")}</DialogTitle>
          <nav className="flex flex-col gap-1">
            {items.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)} className="flex min-h-14 items-center gap-3 rounded-md px-4 text-lg font-semibold hover:bg-accent" activeProps={{ className: "bg-primary text-primary-foreground" }}>
                <n.icon className="size-6" /> {t(n.key)}
              </Link>
            ))}
            <Button variant="ghost" onClick={signOut} className="min-h-14 justify-start px-4 text-lg"><LogOut className="size-6" /> {t("signOut")}</Button>
          </nav>
        </DialogContent>
      </Dialog>

      <main className="mobile-safe-main min-w-0 flex-1 px-4 pt-5 lg:px-10 lg:pb-10 lg:pt-8">
        <Outlet />
      </main>

      <nav aria-label="Warehouse navigation" className="mobile-safe-nav print:hidden fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto bg-charcoal text-charcoal-foreground lg:hidden">
        {items.map((n) => (
          <Link key={n.to} to={n.to} className="flex min-h-16 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold" activeProps={{ className: "bg-primary text-primary-foreground" }}>
            <n.icon className="size-6" /> {t(n.key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
