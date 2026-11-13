import { z } from "zod";

export const websiteLeadSchema = z.object({
  external_id: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().min(5).max(40).regex(/^[+\d\s().-]+$/).optional(),
  message: z.string().trim().max(4000).default(""),
  product: z.string().trim().max(200).default(""),
}).strict().refine((lead) => Boolean(lead.email || lead.phone), "Email or phone is required");

export async function verifyLeadSignature(body: string, timestamp: string | null, signature: string | null, secret: string, now = Date.now()) {
  if (!timestamp || !signature || !/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > 5 * 60 * 1000) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = new Uint8Array(signature.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []);
  return crypto.subtle.verify("HMAC", key, bytes, encoder.encode(`${timestamp}.${body}`));
}