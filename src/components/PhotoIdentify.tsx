import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { identifyPart, type IdentifyResult } from "@/lib/identify.functions";

async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

export function PhotoIdentify() {
  const identify = useServerFn(identifyPart);
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IdentifyResult | null>(null);

  async function onFile(f?: File) {
    if (!f) return;
    setBusy(true); setResult(null);
    try {
      const image = await shrink(f);
      setPreview(image);
      const r = await identify({ data: { image } });
      setResult(r);
      if (r.error) toast.error(r.error);
    } catch { toast.error("Could not read that photo."); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  }

  return (
    <section className="rounded-lg border-2 bg-card p-5 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black"><Sparkles className="size-5 text-primary" /> Identify a part by photo</h2>
        <p className="text-muted-foreground">Take or upload a photo of a part — the app finds the matching item.</p>
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <Button size="xl" className="w-full" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <><Loader2 className="animate-spin" /> Looking…</> : <><ImageUp /> Take / upload photo</>}
      </Button>
      {preview && <img src={preview} alt="Uploaded part" className="mx-auto max-h-56 rounded-md border object-contain" />}
      {result && !result.error && (result.matches.length === 0
        ? <p className="rounded bg-muted p-3">No matching item found. Try a clearer photo.</p>
        : <ul className="divide-y">
            {result.matches.map((m, i) => (
              <li key={m.id}><Link to="/inventory/$id" params={{ id: m.id }} className="flex min-h-14 items-center justify-between gap-3 py-2">
                <span><span className="block text-xs font-bold text-muted-foreground">{m.sku}{i === 0 && " · Best match"}</span><b>{m.name}</b>
                  <span className="block text-sm text-muted-foreground">{m.reason}</span></span>
                <span className="font-display text-xl font-black">{Math.round(m.confidence * 100)}%</span>
              </Link></li>
            ))}
          </ul>)}
    </section>
  );
}
