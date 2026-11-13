import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("CSV export", () => {
  it("quotes delimiters and prevents spreadsheet formulas from running", () => {
    expect(toCsv(["Item", "Note"], [["Bolt, M8", '=HYPERLINK("bad")']])).toBe('"Item","Note"\r\n"Bolt, M8","\'=HYPERLINK(""bad"")"');
  });
});