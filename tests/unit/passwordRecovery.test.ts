import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.fn();
const setSessionCookies = vi.fn();
let allowed = true;

vi.mock("@/lib/devMocks", () => ({ devSamplesEnabled: () => false }));
vi.mock("@/app/api/auth/_lib/session", () => ({
  storefrontClient: () => ({ request }),
  allowPasswordRequest: () => allowed,
  setSessionCookies: (...args: unknown[]) => setSessionCookies(...args),
}));

import { POST as recover } from "@/app/api/auth/recover/route";
import { POST as reset } from "@/app/api/auth/reset/route";

const post = (body: unknown) =>
  new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  request.mockReset();
  setSessionCookies.mockReset();
  allowed = true;
});

describe("POST /api/auth/recover", () => {
  it("gives the same reply whether or not the account exists", async () => {
    request.mockResolvedValueOnce({ customerRecover: { customerUserErrors: [] } });
    const known = await (await recover(post({ email: "a@example.com" }))).json();
    request.mockResolvedValueOnce({ customerRecover: { customerUserErrors: [{ code: "UNIDENTIFIED_CUSTOMER", message: "Could not find customer" }] } });
    const unknownRes = await recover(post({ email: "nobody@example.com" }));
    const unknown = await unknownRes.json();
    expect(unknownRes.status).toBe(200);
    expect(unknown).toEqual(known);
    expect(request).toHaveBeenCalledWith(expect.stringContaining("customerRecover"), { email: "nobody@example.com" });
  });

  it("rejects a bad email without calling Shopify", async () => {
    const res = await recover(post({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(request).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    allowed = false;
    const res = await recover(post({ email: "a@example.com" }));
    expect(res.status).toBe(429);
    expect(request).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/reset", () => {
  const resetUrl = "https://nomadica.myshopify.com/account/reset/123/abc-123";

  it("refuses links that aren't Shopify reset links", async () => {
    const res = await reset(post({ resetUrl: "https://evil.example/steal", password: "travel2025" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID_LINK");
    expect(request).not.toHaveBeenCalled();
  });

  it("enforces the password rules", async () => {
    const res = await reset(post({ resetUrl, password: "short" }));
    expect(res.status).toBe(400);
    expect(request).not.toHaveBeenCalled();
  });

  it("resets and signs in", async () => {
    request.mockResolvedValueOnce({
      customerResetByUrl: { customer: { email: "a@example.com" }, customerAccessToken: { accessToken: "tok" }, customerUserErrors: [] },
    });
    const res = await reset(post({ resetUrl, password: "travel2025" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, signedIn: true });
    expect(setSessionCookies).toHaveBeenCalledWith("tok", "a@example.com");
  });

  it("explains an expired link", async () => {
    request.mockResolvedValueOnce({ customerResetByUrl: { customer: null, customerUserErrors: [{ code: "INVALID", message: "Reset token is invalid" }] } });
    const res = await reset(post({ resetUrl, password: "travel2025" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID_LINK");
  });
});
