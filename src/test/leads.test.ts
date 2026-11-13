import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { websiteLeadSchema, verifyLeadSignature } from "@/lib/leads";

describe("website lead validation", () => {
  it("requires an email or phone contact", () => {
    expect(websiteLeadSchema.safeParse({ external_id: "a", name: "Customer" }).success).toBe(false);
    expect(websiteLeadSchema.safeParse({ external_id: "a", name: "Customer", phone: "+91 1234567890" }).success).toBe(true);
  });
  it("rejects messages over 4000 characters and source overrides", () => {
    expect(websiteLeadSchema.safeParse({ external_id: "a", name: "Customer", email: "a@example.com", message: "a".repeat(4001) }).success).toBe(false);
    expect(websiteLeadSchema.safeParse({ external_id: "a", name: "Customer", email: "a@example.com", source: "other" }).success).toBe(false);
  });
});

describe("website webhook signatures", () => {
  it("requires the exact signed body and rejects signatures older than five minutes", async () => {
    // Test-only value, never used as an app credential.
    const secret = "unit-test-only";
    const timestamp = "1800000000";
    const body = '{"name":"Customer"}';
    const encoder = new TextEncoder();
    const key = await webcrypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const bytes = new Uint8Array(await webcrypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
    const signature = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const now = Number(timestamp) * 1000;
    expect(await verifyLeadSignature(body, timestamp, signature, secret, now)).toBe(true);
    expect(await verifyLeadSignature(body + " ", timestamp, signature, secret, now)).toBe(false);
    expect(await verifyLeadSignature(body, timestamp, signature, secret, now + 301000)).toBe(false);
    expect(await verifyLeadSignature(body, timestamp, null, secret, now)).toBe(false);
  });
});