import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";

export const Route = createFileRoute("/set-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set your password — HIMGIRI Warehouse" },
      { name: "description", content: "Activate your HIMGIRI Warehouse account or reset your password." },
      { property: "og:title", content: "Set your password — HIMGIRI Warehouse" },
      { property: "og:description", content: "Activate your HIMGIRI Warehouse account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SetPassword,
});

function SetPassword() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password saved. Welcome to HIMGIRI Warehouse.");
    nav({ to: "/dashboard" });
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <Brand />
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-lg border bg-card p-5 sm:p-8">
        <h1 className="text-3xl font-black">Set your password</h1>
        <div className="space-y-2">
          <Label htmlFor="pw" className="text-base">New password (min 8 characters)</Label>
          <Input id="pw" type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} className="h-14 text-lg" />
        </div>
        <Button size="xl" className="w-full" disabled={busy}>Save and continue</Button>
      </form>
    </div>
  );
}
