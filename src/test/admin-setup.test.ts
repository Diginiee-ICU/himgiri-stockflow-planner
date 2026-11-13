import { describe, expect, it } from "vitest";
import { adminSetupSchema, setupIsClosed } from "@/lib/admin-setup";

describe("First administrator setup", () => {
  it("closes permanently after completion", () => expect(setupIsClosed(true, 0)).toBe(true));
  it("cannot replace an existing administrator", () => expect(setupIsClosed(false, 1)).toBe(true));
  it("opens only with no completed setup and no administrator", () => expect(setupIsClosed(false, 0)).toBe(false));
  it("requires a private setup code", () => {
    expect(adminSetupSchema.safeParse({ fullName: "Owner", email: "owner@example.com", password: "example-password", setupCode: "" }).success).toBe(false);
  });
});