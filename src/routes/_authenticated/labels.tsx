import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { z } from "zod";
import { Printer } from "lucide-react";
import { PageHeader, Empty } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/lib/auth";
import { useItems } from "@/lib/data";
import { itemQrUrl, binQrUrl } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/labels")({
  validateSearch: z.object({ item: z.string().optional() }),
  head: () => ({ meta: [{ title: "QR labels — HIMGIRI Warehouse" }, { name: "description", content: "Print QR labels for HIMGIRI inventory items and storage bins." }, { property: "og:title", content: "QR labels — HIMGIRI Warehouse" }, { property: "og:description", content: "Print QR labels for HIMGIRI inventory items and storage bins." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Labels,
});

type Label = { key: string; title: string; sub: string; url: string };

function QrImg({ url }: { url: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 300, errorCorrectionLevel: "M" }).then(setSrc); }, [url]);
  return src ? <img src={src} alt="QR code" className="size-32" /> : <div className="size-32 bg-muted" />;
}

function Labels() {
  const { data: me } = useMe();
  const { data: items = [] } = useItems();
  const { item: preselect } = Route.useSearch();
  const [tab, setTab] = useState<"items" | "bins">("items");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => { if (preselect) setSel(new Set(["i:" + preselect])); }, [preselect]);

  const bins = useMemo(() => [...new Set(items.map((i) => i.bin_location).filter((b): b is string => !!b))].sort(), [items]);
  const toggle = (k: string) => setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  if (!me?.isManager) return <Empty title="Admins only" />;

  const labels: Label[] = [
    ...items.filter((i) => sel.has("i:" + i.id)).map((i) => ({ key: "i:" + i.id, title: i.name, sub: i.sku, url: itemQrUrl(origin, i.id) })),
    ...bins.filter((b) => sel.has("b:" + b)).map((b) => ({ key: "b:" + b, title: `BIN ${b}`, sub: "Storage bin", url: binQrUrl(origin, b) })),
  ];
  const list = items.filter((i) => (i.name + i.sku).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="print:hidden">
        <PageHeader title="QR labels" subtitle="Pick items or bins, then print. Scanning opens the item or bin." actions={
          <Button size="xl" disabled={!labels.length} onClick={() => window.print()}><Printer /> Print {labels.length || ""} labels</Button>} />
        <div className="mb-3 flex gap-2">
          <Button variant={tab === "items" ? "charcoal" : "outline"} onClick={() => setTab("items")}>Items &amp; products</Button>
          <Button variant={tab === "bins" ? "charcoal" : "outline"} onClick={() => setTab("bins")}>Bins ({bins.length})</Button>
          {sel.size > 0 && <Button variant="ghost" onClick={() => setSel(new Set())}>Clear</Button>}
        </div>
        {tab === "items" ? (
          <>
            <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 h-12 bg-card" />
            <div className="mb-6 max-h-80 divide-y overflow-y-auto rounded-lg border bg-card">
              {list.map((i) => (
                <label key={i.id} className="flex min-h-12 cursor-pointer items-center gap-3 px-4">
                  <input type="checkbox" className="size-5 accent-primary" checked={sel.has("i:" + i.id)} onChange={() => toggle("i:" + i.id)} />
                  <span className="text-sm font-bold text-muted-foreground">{i.sku}</span> {i.name}
                </label>
              ))}
            </div>
          </>
        ) : bins.length === 0 ? <div className="mb-6"><Empty title="No bins yet">Set a bin location on items to create bin labels.</Empty></div> : (
          <div className="mb-6 flex flex-wrap gap-2">
            {bins.map((b) => <Button key={b} variant={sel.has("b:" + b) ? "default" : "outline"} onClick={() => toggle("b:" + b)}>{b}</Button>)}
          </div>
        )}
        {labels.length > 0 && <h2 className="mb-3 text-xl font-bold">Preview</h2>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
        {labels.map((l) => (
          <div key={l.key} className="flex break-inside-avoid flex-col items-center rounded border-2 border-charcoal bg-card p-3 text-center">
            <div className="font-display text-xs font-black tracking-widest">HIMGIRI</div>
            <QrImg url={l.url} />
            <div className="text-sm font-bold leading-tight">{l.title}</div>
            <div className="text-xs text-muted-foreground">{l.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
