import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Loader2, Minus, Package, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductPhotoInput } from "./ProductPhotoInput";
import { useItems, useCategories } from "@/lib/data";
import { useMe } from "@/lib/auth";
import { onboardingSchema, openingMovements, suggestSku, type OnboardingPayload } from "@/lib/onboarding";
import { suggestProductFromPhoto } from "@/lib/product-ai.functions";
import { IMAGE_BUCKET, uploadPhoto } from "@/lib/inventory-images";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type PartDraft = { key: string; itemId: string; name: string; sku: string; unit: string; kind: "component" | "raw_material"; quantity: string; stock: string; description: string; photo: string; uncertain: boolean };
const emptyPart = (): PartDraft => ({ key: crypto.randomUUID(), itemId: "", name: "", sku: "", unit: "pcs", kind: "component", quantity: "1", stock: "0", description: "", photo: "", uncertain: false });
const initialProduct = { name: "", sku: "", unit: "pcs", category_id: "", description: "", model: "", variant: "", photo: "", stock: "0" };
const steps = ["Product type", "Product details", "Parts / BOM", "Opening stock", "Review"];

export function ProductOnboardingWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex max-h-[94dvh] w-[calc(100%-1rem)] flex-col overflow-hidden p-0 sm:max-w-4xl"><WizardBody onClose={() => onOpenChange(false)} /></DialogContent></Dialog>;
}

function WizardBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { data: items = [] } = useItems();
  const { data: categories = [] } = useCategories();
  const analyze = useServerFn(suggestProductFromPhoto);
  const [step, setStep] = useState(0);
  const [type, setType] = useState<"ladder" | "other" | null>(null);
  const [method, setMethod] = useState<"manual" | "ai">("manual");
  const [product, setProduct] = useState(initialProduct);
  const [parts, setParts] = useState<PartDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const candidates = items.filter((item) => item.kind === "component" || item.kind === "raw_material");
  const editProduct = (key: keyof typeof product, value: string) => { setProduct((previous) => ({ ...previous, [key]: value })); setReviewed(false); };
  const editPart = (key: string, patch: Partial<PartDraft>) => { setParts((previous) => previous.map((part) => part.key === key ? { ...part, ...patch } : part)); setReviewed(false); };

  function payload(): OnboardingPayload {
    return onboardingSchema.parse({ ...product, kind: "finished", image_url: product.photo, opening_stock: product.stock,
      bom: parts.map((part) => ({ item_id: part.itemId || null, quantity: part.quantity, part: part.itemId ? null : { name: part.name, sku: part.sku, unit: part.unit, kind: part.kind, description: part.description, image_url: part.photo, opening_stock: part.stock } })) });
  }
  function check(nextStep: number) {
    setError("");
    try {
      if (step === 0 && !type) throw new Error("Choose Ladder or Other.");
      if (step === 1) {
        z.object({ name: z.string().trim().min(2, "Enter the product name").max(160), sku: z.string().trim().min(2, "Enter the product SKU").max(40), unit: z.string().trim().min(1).max(20) }).parse(product);
        if (method === "ai" && !aiAnalyzed) throw new Error("Identify the uploaded photo, or choose manual entry.");
      }
      if (step === 2) onboardingSchema.parse({ ...product, kind: "finished", image_url: product.photo, opening_stock: 0, bom: parts.map((part) => ({ item_id: part.itemId || null, quantity: part.quantity, part: part.itemId ? null : { ...part, image_url: part.photo, opening_stock: 0 } })) });
      if (step === 3) payload();
      if (items.some((item) => item.sku.toLowerCase() === product.sku.trim().toLowerCase()) && step > 0) throw new Error("This product SKU is already in inventory.");
      if (step >= 2 && parts.some((part) => !part.itemId && items.some((item) => item.sku.toLowerCase() === part.sku.trim().toLowerCase()))) throw new Error("A new part SKU already exists. Select that inventory part instead.");
      setStep(nextStep);
    } catch (failure) { setError(failure instanceof z.ZodError ? failure.errors.map((issue) => `${issue.path.join(" / ")}: ${issue.message}`).join("; ") : (failure as Error).message); }
  }

  async function identify() {
    if (!product.photo || blocked) return;
    setBusy(true); setError("");
    try {
      const result = await analyze({ data: { image: product.photo, name: product.name, productType: type ?? "other" } });
      if (result.error || !result.suggestion) { setError(result.error ?? "No product found."); setBlocked(result.blocked ?? false); return; }
      const suggestion = result.suggestion;
      if (!suggestion.parts.length) { setError(suggestion.warning || "No parts identified. Enter the product manually."); return; }
      setProduct((previous) => ({ ...previous, name: previous.name || suggestion.name, sku: previous.sku || `${suggestSku(previous.name || suggestion.name)}-${Date.now().toString().slice(-5)}`, description: suggestion.description }));
      setParts(suggestion.parts.map((part, index) => ({ ...emptyPart(), name: part.name, sku: `${suggestSku(part.name)}-${Date.now().toString().slice(-5)}-${index + 1}`, quantity: String(part.quantity), unit: part.unit, description: part.description, uncertain: part.uncertain })));
      setWarning(suggestion.warning || "Verify every part and quantity against the actual product. Hidden parts may be missing.");
      setAiAnalyzed(true); setReviewed(false);
    } catch (failure) { setError((failure as Error).message || "Photo identification failed."); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!me?.isManager || !reviewed || saving) return;
    const uploaded: string[] = [];
    let committed = false;
    setSaving(true); setError("");
    try {
      const data = payload();
      const folder = crypto.randomUUID();
      const image = await uploadPhoto(data.image_url, folder);
      if (image.path) uploaded.push(image.path);
      data.image_url = image.reference;
      for (const row of data.bom) {
        if (!row.part) continue;
        const photo = await uploadPhoto(row.part.image_url, folder);
        if (photo.path) uploaded.push(photo.path);
        row.part.image_url = photo.reference;
      }
      const { data: result, error: saveError } = await supabase.rpc("onboard_product", { _payload: data as unknown as Json });
      if (saveError) throw saveError;
      committed = true;
      const saved = z.object({ product_id: z.string().uuid() }).parse(result);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["items"] }), queryClient.invalidateQueries({ queryKey: ["bom"] }), queryClient.invalidateQueries({ queryKey: ["txns"] })]);
      toast.success("Product, parts and opening stock saved");
      onClose(); navigate({ to: "/inventory/$id", params: { id: saved.product_id } });
    } catch (failure) {
      if (!committed && uploaded.length) await supabase.storage.from(IMAGE_BUCKET).remove(uploaded);
      setError((failure as Error).message || "Could not save. Your entries are still here.");
    } finally { setSaving(false); }
  }

  const field = (key: keyof typeof product, label: string, inputType = "text") => <div className="space-y-1"><Label htmlFor={`product-${key}`}>{label}</Label><Input id={`product-${key}`} type={inputType} value={product[key]} onChange={(event) => editProduct(key, event.target.value)} className="h-12" /></div>;
  const partField = (part: PartDraft, key: "name" | "sku" | "unit" | "quantity" | "stock", label: string, inputType = "text") => <div className="min-w-0 space-y-1"><Label htmlFor={`${part.key}-${key}`}>{label}</Label><Input id={`${part.key}-${key}`} value={part[key]} type={inputType} min={key === "quantity" ? "0.001" : "0"} step="any" onChange={(event) => editPart(part.key, { [key]: event.target.value })} className="h-12" /></div>;

  return <>
    <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-5 text-left">
      <DialogTitle className="pr-8 text-2xl">New product</DialogTitle>
      <DialogDescription>Step {step + 1} of 5 · {steps[step]}</DialogDescription>
      <div className="flex gap-1 pt-2" aria-label="Setup progress">{steps.map((label, index) => <div key={label} className={`h-1.5 flex-1 rounded-sm ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
    </DialogHeader>
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
      {step === 0 && <>
        <h2 className="text-xl font-bold">What product do you want to add?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="xl" variant={type === "ladder" ? "default" : "outline"} className="h-24 text-xl" onClick={() => setType("ladder")}><ClipboardList /> Ladder</Button>
          <Button size="xl" variant={type === "other" ? "default" : "outline"} className="h-24 text-xl" onClick={() => setType("other")}><Package /> Other</Button>
        </div>
        {type && <div className="space-y-3 border-t pt-4"><h3 className="font-bold">How would you like to start?</h3><div className="grid gap-3 sm:grid-cols-2">
          <Button variant={method === "manual" ? "charcoal" : "outline"} className="h-auto min-h-20 whitespace-normal p-4 text-left" onClick={() => setMethod("manual")}><Plus /> Enter product & parts</Button>
          <Button variant={method === "ai" ? "charcoal" : "outline"} className="h-auto min-h-20 whitespace-normal p-4 text-left" onClick={() => setMethod("ai")}><Sparkles /> Identify from a photo</Button>
        </div></div>}
      </>}
      {step === 1 && <>
        {method === "ai" && <div className="space-y-3 border-b pb-4">
          <div className="space-y-1"><Label htmlFor="photo-product-name">Product name (optional)</Label><Input id="photo-product-name" value={product.name} onChange={(event) => editProduct("name", event.target.value)} className="h-12" /></div>
          <ProductPhotoInput label="Upload product photo" value={product.photo} onChange={(photo) => { editProduct("photo", photo); setAiAnalyzed(false); }} />
          <Button size="xl" className="w-full whitespace-normal" disabled={!product.photo || busy || blocked} onClick={identify}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}{busy ? "Identifying product & parts…" : "Identify product & parts"}</Button>
          {aiAnalyzed && <div className="flex items-center gap-2 font-semibold text-success"><Check /> {parts.length} proposed parts ready for review</div>}
          <Button variant="link" onClick={() => setMethod("manual")}>Use manual entry instead</Button>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "Product name *")}{field("sku", "Product SKU *")}{field("unit", "Stock unit *")}
          <div className="space-y-1"><Label>Category</Label><Select value={product.category_id || "none"} onValueChange={(value) => editProduct("category_id", value === "none" ? "" : value)}><SelectTrigger className="h-12"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No category</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
          {type === "ladder" && <>{field("model", "Ladder model")}{field("variant", "Steps / variant")}</>}
        </div>
        <div className="space-y-1"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" value={product.description} onChange={(event) => editProduct("description", event.target.value)} /></div>
        {method === "manual" && <ProductPhotoInput label="Add product photo (optional)" value={product.photo} onChange={(photo) => editProduct("photo", photo)} />}
      </>}
      {step === 2 && <>
        <h2 className="text-xl font-bold">Parts needed for one {type === "ladder" ? "ladder" : "product"}</h2>
        {warning && <p className="border-l-4 border-warning bg-warning/10 p-3 text-sm">{warning}</p>}
        <div className="divide-y">{parts.map((part, index) => <div key={part.key} className="space-y-3 py-4">
          <div className="flex items-center justify-between gap-2"><h3 className="font-bold">Part {index + 1}{part.uncertain && <span className="ml-2 text-sm text-muted-foreground">Estimated · check physically</span>}</h3><Button variant="ghost" size="icon" aria-label={`Remove part ${index + 1}`} title="Remove part" onClick={() => { setParts(parts.filter((row) => row.key !== part.key)); setReviewed(false); }}><Trash2 /></Button></div>
          {type === "ladder" && <Select value={part.itemId || "new"} onValueChange={(value) => editPart(part.key, { itemId: value === "new" ? "" : value })}><SelectTrigger className="h-12"><SelectValue placeholder="Create or select a part" /></SelectTrigger><SelectContent><SelectItem value="new">Create a new part</SelectItem>{candidates.map((item) => <SelectItem key={item.id} value={item.id}>{item.sku} — {item.name}</SelectItem>)}</SelectContent></Select>}
          {!part.itemId && <div className="grid gap-3 sm:grid-cols-2">{partField(part, "name", "Part name *")}{partField(part, "sku", "Part SKU *")}{partField(part, "unit", "Stock unit *")}
            <div className="space-y-1"><Label>Part type</Label><Select value={part.kind} onValueChange={(value) => editPart(part.key, { kind: value as PartDraft["kind"] })}><SelectTrigger className="h-12"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="component">Component</SelectItem><SelectItem value="raw_material">Raw material</SelectItem></SelectContent></Select></div>
          </div>}
          <div className="min-w-0 space-y-1">
            <Label htmlFor={`${part.key}-quantity`}>{type === "ladder" ? "Quantity per ladder *" : "Quantity per product *"}</Label>
            <div className="flex max-w-sm items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="size-12 shrink-0" aria-label={`Decrease quantity for part ${index + 1}`} title="Decrease quantity by 1" disabled={!Number.isFinite(Number(part.quantity)) || Number(part.quantity) <= 1} onClick={() => editPart(part.key, { quantity: String(Number((Number(part.quantity) - 1).toFixed(6))) })}><Minus /></Button>
              <Input id={`${part.key}-quantity`} aria-label={`Quantity for part ${index + 1}`} type="number" inputMode="decimal" min="0.001" step="any" value={part.quantity} onChange={(event) => editPart(part.key, { quantity: event.target.value })} className="h-12 min-w-0 flex-1 text-center text-lg font-bold" />
              <Button type="button" variant="outline" size="icon" className="size-12 shrink-0" aria-label={`Increase quantity for part ${index + 1}`} title="Increase quantity by 1" disabled={!Number.isFinite(Number(part.quantity))} onClick={() => editPart(part.key, { quantity: String(Number((Math.max(0, Number(part.quantity)) + 1).toFixed(6))) })}><Plus /></Button>
            </div>
          </div>
          {!part.itemId && <ProductPhotoInput label={`Add part ${index + 1} photo (optional)`} value={part.photo} onChange={(photo) => editPart(part.key, { photo })} />}
        </div>)}</div>
        <Button variant="outline" onClick={() => setParts([...parts, emptyPart()])}><Plus /> Add part</Button>
      </>}
      {step === 3 && <>
        <h2 className="text-xl font-bold">Stock physically available now</h2>
        <p className="text-sm text-muted-foreground">Count finished products and unused parts separately. Opening stock does not consume parts or count as production.</p>
        {field("stock", `Finished ${product.name || "product"} opening stock`, "number")}
        <div className="divide-y">{parts.map((part) => <div key={part.key} className="py-3">{part.itemId ? <div className="flex flex-wrap justify-between gap-2"><b>{items.find((item) => item.id === part.itemId)?.name}</b><span>{items.find((item) => item.id === part.itemId)?.available_stock ?? 0} already in inventory · unchanged</span></div> : partField(part, "stock", `${part.name || "New part"} opening stock (${part.unit})`, "number")}</div>)}</div>
      </>}
      {step === 4 && <>
        <div className="flex flex-wrap items-center gap-4 border-b pb-4">{product.photo && <img src={product.photo} alt={product.name} className="size-24 bg-muted object-contain" />}<div className="min-w-0"><h2 className="break-words text-2xl font-bold">{product.name}</h2><p className="break-words text-muted-foreground">{product.sku} · {type === "ladder" ? "Ladder" : "Other"}</p><p className="font-semibold">{product.stock} {product.unit} finished opening stock</p></div></div>
        <div className="divide-y">{parts.map((part) => <div key={part.key} className="flex flex-wrap justify-between gap-2 py-3"><div className="min-w-0"><b className="break-words">{part.itemId ? items.find((item) => item.id === part.itemId)?.name : part.name}</b><p className="text-sm text-muted-foreground">{part.itemId ? "Existing inventory part" : `${part.sku} · New part · Opening stock: ${part.stock} ${part.unit}`}</p></div><b>× {part.quantity} per {type === "ladder" ? "ladder" : "product"}</b></div>)}</div>
        <p className="text-sm text-muted-foreground">{openingMovements(payload()).length} opening-stock entries · {parts.filter((part) => !part.itemId).length} new parts</p>
        {warning && <p className="border-l-4 border-warning bg-warning/10 p-3 text-sm">{warning}</p>}
        <label className="flex cursor-pointer items-start gap-3 border-t pt-4"><Checkbox checked={reviewed} onCheckedChange={(checked) => setReviewed(checked === true)} className="mt-1" /><span>I have verified the product, every part, quantities and physical opening stock.</span></label>
      </>}
      {error && <p role="alert" className="break-words rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p>}
    </div>
    <div className="flex shrink-0 flex-wrap justify-between gap-2 border-t bg-background p-4">
      <Button variant="outline" disabled={busy || saving} onClick={() => step === 0 ? onClose() : setStep(step - 1)}><ArrowLeft />{step === 0 ? "Cancel" : "Back"}</Button>
      {step < 4 ? <Button disabled={busy || (step === 0 && !type)} onClick={() => check(step + 1)}>Continue <ArrowRight /></Button> : <Button disabled={!reviewed || saving || !me?.isManager} onClick={save}>{saving ? <Loader2 className="animate-spin" /> : <Check />}{saving ? "Saving…" : "Create product"}</Button>}
    </div>
  </>;
}