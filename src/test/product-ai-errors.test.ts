import { describe, expect, it, vi } from "vitest";

vi.mock("@ai-sdk/openai", () => ({ createOpenAI: () => ({ responses: () => ({}) }) }));
vi.mock("ai", () => ({ Output: { object: () => ({}) }, streamText: (options: { onError: (event: { error: unknown }) => void }) => {
  const failure = { statusCode: 402, responseBody: '{"message":"Not enough credits"}' };
  options.onError({ error: failure });
  return { output: Promise.reject(new Error("No output generated")) };
} }));
import { analyzeProductPhoto } from "@/lib/product-ai.server";

describe("Product photo analysis errors", () => {
  it("preserves the credit failure instead of hiding it behind empty output", async () => {
    await expect(analyzeProductPhoto(new Request("http://localhost:8080"), "test", "data:image/jpeg;base64,aGVsbG8=", "")).rejects.toMatchObject({ statusCode: 402, responseBody: '{"message":"Not enough credits"}' });
  });
});