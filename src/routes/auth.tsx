import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { firstAdminSetup } from "@/lib/admin-setup.functions";
import { adminSetupSchema } from "@/lib/admin-setup";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — HIMGIRI Warehouse" },
      { name: "description", content: "Employee sign in for HIMGIRI Warehouse." },
      { property: "og:title", content: "Sign in — HIMGIRI Warehouse" },
      { property: "og:description", content: "Employee sign in for HIMGIRI Warehouse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const setup = useServerFn(firstAdminSetup);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/dashboard" });
      } else if (mode === "up") {
        await setup({ data: adminSetupSchema.parse({ email, password, fullName, setupCode }) });
        setSetupCode("");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Administrator account ready. Welcome to HIMGIRI Warehouse.");
        nav({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/set-password` });
        if (error) throw error;
        toast.success("Password reset link sent.");
        setMode("in");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-charcoal p-12 text-charcoal-foreground lg:flex">
        <Brand />
        <img src="/images/ladder.jpg" alt="HIMGIRI aluminium ladder" className="absolute -right-10 bottom-0 h-[85%] object-contain opacity-30 mix-blend-luminosity" width={768} height={1024} />
        <div className="relative max-w-sm">
          <div className="mb-4 h-2 w-24 stripe-accent" />
          <h1 className="text-5xl font-black leading-[1.05]">HIMGIRI<br /><span className="text-primary">Warehouse</span></h1>
        </div>
      </div>
      <div className="flex min-w-0 flex-col items-center justify-center px-4 py-6 sm:p-6">
        <div className="mb-8 lg:hidden"><Brand /></div>
        <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-lg border bg-card p-5 shadow-sm sm:p-8">
          <h2 className="break-words text-2xl font-black sm:text-3xl">{mode === "in" ? t("signIn") : mode === "up" ? "Create first admin account" : "Reset password"}</h2>
          {mode === "up" && <>
            <div className="space-y-2">
              <Label htmlFor="full-name">Your name</Label>
              <Input id="full-name" autoComplete="name" required maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-14" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-code">Private setup code</Label>
              <Input id="setup-code" type="password" autoComplete="off" required maxLength={1024} value={setupCode} onChange={(e) => setSetupCode(e.target.value)} className="h-14" />
            </div>
          </>}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">{t("email")}</Label>
            <Input id="email" type="email" autoComplete="email" autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 text-lg" />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="pw" className="text-base">{t("password")}</Label>
              <Input id="pw" type="password" autoComplete={mode === "up" ? "new-password" : "current-password"} required minLength={mode === "up" ? 12 : 8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 text-lg" />
            </div>
          )}
          <Button type="submit" size="xl" className="w-full" disabled={busy}>
            {mode === "in" ? t("signIn") : mode === "up" ? "Create account" : "Send reset link"}
          </Button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            {mode !== "in" ? (
              <Button type="button" variant="link" className="px-0 text-sm" onClick={() => setMode("in")}>{t("back")}</Button>
            ) : (
              <>
                <Button type="button" variant="link" className="px-0 text-sm" onClick={() => setMode("forgot")}>Forgot password?</Button>
                <Button type="button" variant="link" className="px-0 text-sm text-muted-foreground" onClick={() => setMode("up")}>First-time setup</Button>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Employees: ask your Admin for an invitation email.</p>
        </form>
        <div className="mt-6 flex gap-2">
          <Button variant={lang === "en" ? "charcoal" : "outline"} onClick={() => setLang("en")}>English</Button>
          <Button variant={lang === "hi" ? "charcoal" : "outline"} onClick={() => setLang("hi")}>हिन्दी</Button>
        </div>
      </div>
    </div>
  );
}
