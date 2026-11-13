import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — HIMGIRI Warehouse" }, { name: "description", content: "Language and display settings for HIMGIRI Warehouse." }, { property: "og:title", content: "Settings — HIMGIRI Warehouse" }, { property: "og:description", content: "Language and display settings for HIMGIRI Warehouse." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang, simple, setSimple } = useI18n();
  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title={t("settings")} />
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-xl font-bold">{t("language")}</h2>
        <div className="flex gap-2">
          <Button size="xl" variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>English</Button>
          <Button size="xl" variant={lang === "hi" ? "default" : "outline"} onClick={() => setLang("hi")}>हिन्दी</Button>
        </div>
      </section>
      <section className="flex items-center justify-between rounded-lg border bg-card p-5">
        <div><h2 className="text-xl font-bold">{t("simpleMode")}</h2><p className="text-muted-foreground">Bigger text for warehouse use.</p></div>
        <Switch checked={simple} onCheckedChange={setSimple} className="scale-150" />
      </section>
    </div>
  );
}
