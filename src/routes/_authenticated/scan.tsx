import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, CameraOff, Printer } from "lucide-react";
import { z } from "zod";
import { PageHeader, Empty, fmt } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/auth";
import { useItems } from "@/lib/data";
import { parseScan } from "@/lib/qr";
import { PhotoIdentify } from "@/components/PhotoIdentify";

export const Route = createFileRoute("/_authenticated/scan")({
  validateSearch: z.object({ bin: z.string().optional() }),
  head: () => ({ meta: [{ title: "Scan QR — HIMGIRI Warehouse" }, { name: "description", content: "Scan item and bin QR codes with your phone camera." }, { property: "og:title", content: "Scan QR — HIMGIRI Warehouse" }, { property: "og:description", content: "Scan item and bin QR codes with your phone camera." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Scan,
});

function Scan() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const nav = useNavigate();
  const { bin } = Route.useSearch();
  const { data: items = [] } = useItems();
  const [sku, setSku] = useState("");
  const [on, setOn] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  function handle(text: string) {
    const r = parseScan(text);
    if (r.type === "item") return nav({ to: "/inventory/$id", params: { id: r.id } });
    if (r.type === "bin") return nav({ to: "/scan", search: { bin: r.bin } });
    const i = itemsRef.current.find((x) => x.sku.toLowerCase() === r.sku.toLowerCase());
    if (!i) { toast.error(`No item found for "${r.sku}"`); return; }
    return nav({ to: "/inventory/$id", params: { id: i.id } });
  }

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const s = new Html5Qrcode("qr-reader");
      scannerRef.current = s;
      try {
        await s.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => {
          setOn(false);
          handle(text);
        }, () => {});
      } catch (e) {
        toast.error("Camera not available. Allow camera access and try again.");
        setOn(false);
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) s.stop().then(() => s.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  const binItems = bin ? items.filter((i) => i.bin_location === bin) : [];

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={t("scan")} subtitle="Point the camera at an item or bin QR label."
        actions={me?.isManager && <Button variant="outline" size="xl" asChild><Link to="/labels"><Printer /> Print labels</Link></Button>} />

      {bin && (
        <section className="rounded-lg border-2 border-primary bg-card p-5">
          <div className="text-sm font-bold uppercase text-muted-foreground">Bin</div>
          <h2 className="text-3xl font-black">{bin}</h2>
          {binItems.length === 0 ? <p className="mt-2 text-muted-foreground">No items are stored in this bin.</p> : (
            <ul className="mt-3 divide-y">
              {binItems.map((i) => (
                <li key={i.id}><Link to="/inventory/$id" params={{ id: i.id }} className="flex min-h-14 items-center justify-between gap-3 py-2">
                  <span><span className="block text-xs font-bold text-muted-foreground">{i.sku}</span><b>{i.name}</b></span>
                  <span className="font-display text-2xl font-black">{fmt(i.available_stock)} <span className="text-sm">{i.unit}</span></span>
                </Link></li>
              ))}
            </ul>
          )}
          {!me?.isManager && <p className="mt-3 rounded bg-muted p-3 text-sm font-semibold">{t("readOnly")}</p>}
        </section>
      )}

      <div className="overflow-hidden rounded-lg border bg-charcoal">
        <div id="qr-reader" className={on ? "w-full" : "hidden"} />
        {!on && <div className="grid h-56 place-items-center text-charcoal-foreground"><Camera className="size-16 opacity-60" /></div>}
      </div>
      <Button size="xl" className="w-full" variant={on ? "charcoal" : "default"} onClick={() => setOn(!on)}>
        {on ? <><CameraOff /> Stop camera</> : <><Camera /> Start camera scan</>}
      </Button>

      <div>
        <div className="mb-2 font-semibold">Or type the SKU</div>
        <div className="flex gap-2">
          <Input value={sku} onChange={(e) => setSku(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handle(sku)} placeholder="e.g. AL-STEP" className="h-14 bg-card text-xl" />
          <Button size="xl" onClick={() => handle(sku)}>Open</Button>
        </div>
      </div>
      <PhotoIdentify />
      {items.length === 0 && <Empty title="No items yet" />}
    </div>
  );
}
