import { describe, expect, it } from "vitest";
import { requireStaffProfile } from "@/lib/auth";

describe("Staff account access", () => {
  it("does not mistake a missing staff record for a deactivated account", () => {
    expect(() => requireStaffProfile(null)).toThrow("staff record is missing");
  });
  it("preserves explicit deactivation", () => {
    expect(requireStaffProfile({ active: false }).active).toBe(false);
  });
  it("accepts an active staff record", () => {
    expect(requireStaffProfile({ active: true }).active).toBe(true);
  });
});