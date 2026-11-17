import { describe, expect, it, vi } from "vitest";

// A visitor with no cookies at all.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {} }),
}));

describe("customer order routes", () => {
  it("does not list any orders for a visitor who isn't signed in", async () => {
    const { GET } = await import("@/app/api/orders/route");
    expect((await GET()).status).toBe(401);
  });

  it("does not return a single order for a visitor who isn't signed in", async () => {
    const { GET } = await import("@/app/api/orders/[id]/route");
    const res = await GET(new Request("http://localhost/api/orders/1"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });
});
