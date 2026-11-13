import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readPhoto } from "@/lib/inventory-images";

export function ProductPhotoInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function change(file?: File) {
    if (!file) return;
    setBusy(true);
    try { onChange(await readPhoto(file)); } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  }
  return <div className="space-y-2">
    <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/heic" aria-label={label} className="hidden" onChange={(event) => change(event.target.files?.[0])} />
    {value && <img src={value} alt={label} className="h-32 w-full rounded-md bg-muted object-contain" />}
    <div className="flex gap-2">
      <Button type="button" variant="outline" className="min-w-0 flex-1 whitespace-normal" disabled={busy} onClick={() => ref.current?.click()}>{busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}{value ? "Change photo" : label}</Button>
      {value && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${label}`} title="Remove photo" onClick={() => onChange("")}><X /></Button>}
    </div>
  </div>;
}