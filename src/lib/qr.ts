/** QR payloads: items encode an /inventory/<id> URL, bins encode /scan?bin=<code>. */
export const itemQrUrl = (origin: string, id: string) => `${origin}/inventory/${id}`;
export const binQrUrl = (origin: string, bin: string) => `${origin}/scan?bin=${encodeURIComponent(bin)}`;

export type ScanResult = { type: "item"; id: string } | { type: "bin"; bin: string } | { type: "sku"; sku: string };

export function parseScan(text: string): ScanResult {
  const t = text.trim();
  const item = t.match(/\/inventory\/([0-9a-f-]{36})/i);
  if (item?.[1]) return { type: "item", id: item[1] };
  try {
    const u = new URL(t);
    const bin = u.searchParams.get("bin");
    if (bin) return { type: "bin", bin };
  } catch { /* not a URL */ }
  return { type: "sku", sku: t };
}
