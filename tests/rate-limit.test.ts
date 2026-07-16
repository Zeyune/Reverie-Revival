import { describe, expect, it } from "vitest";
import {
  buildNetworkRateLimitRules,
  getRequestRateLimitContext,
} from "@/lib/rate-limit";

const requestWith = (headers: Record<string, string>) =>
  new Request("https://reverie-revival.test/api/checkout", {
    method: "POST",
    headers: { host: "reverie-revival.test", ...headers },
  });

describe("getRequestRateLimitContext", () => {
  it("takes the rightmost X-Forwarded-For entry, not the client-supplied leftmost", () => {
    // "1.2.3.4" is what the caller claimed; "203.0.113.9" is what our edge saw.
    const context = getRequestRateLimitContext(
      requestWith({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" })
    );

    expect(context.ipAddress).toBe("203.0.113.9");
  });

  it("cannot be evaded by prepending a forged hop", () => {
    // The attack: rotate the leftmost value per request so the ip: bucket never
    // accumulates. Every one of these must resolve to the same real IP.
    const forged = ["9.9.9.9", "8.8.8.8", "7.7.7.7"].map(
      (spoof) =>
        getRequestRateLimitContext(
          requestWith({ "x-forwarded-for": `${spoof}, 203.0.113.9` })
        ).ipAddress
    );

    expect(new Set(forged)).toEqual(new Set(["203.0.113.9"]));
  });

  it("cannot be used to burn a victim's quota", () => {
    const victimPinned = getRequestRateLimitContext(
      requestWith({ "x-forwarded-for": "198.51.100.7, 203.0.113.9" })
    );

    expect(victimPinned.ipAddress).not.toBe("198.51.100.7");
    expect(victimPinned.ipAddress).toBe("203.0.113.9");
  });

  it("prefers a platform header over X-Forwarded-For", () => {
    const context = getRequestRateLimitContext(
      requestWith({
        "x-vercel-forwarded-for": "203.0.113.9",
        "x-forwarded-for": "1.2.3.4",
      })
    );

    expect(context.ipAddress).toBe("203.0.113.9");
  });

  it("handles a single-entry X-Forwarded-For", () => {
    const context = getRequestRateLimitContext(
      requestWith({ "x-forwarded-for": "203.0.113.9" })
    );

    expect(context.ipAddress).toBe("203.0.113.9");
  });

  it("returns no IP when there are no forwarding headers", () => {
    expect(getRequestRateLimitContext(requestWith({})).ipAddress).toBeNull();
  });

  it("never records an IP for .onion visitors", () => {
    const context = getRequestRateLimitContext(
      new Request("https://example.onion/api/checkout", {
        method: "POST",
        headers: { host: "example.onion", "x-forwarded-for": "203.0.113.9" },
      })
    );

    expect(context.isOnion).toBe(true);
    expect(context.ipAddress).toBeNull();
  });
});

describe("buildNetworkRateLimitRules", () => {
  const context = { host: "reverie-revival.test", ipAddress: "203.0.113.9", isOnion: false };

  it("fails closed — every rule has a finite default limit", () => {
    const rules = buildNetworkRateLimitRules(context, ["email:a@b.co"]);

    expect(rules).not.toHaveLength(0);
    for (const rule of rules) {
      expect(Number.isFinite(rule.limit)).toBe(true);
      expect(rule.limit).toBeGreaterThan(0);
    }
  });

  it("keeps the host ceiling well above the per-IP one", () => {
    const rules = buildNetworkRateLimitRules(context);
    const host = rules.find((r) => r.key.startsWith("host:"));
    const ip = rules.find((r) => r.key.startsWith("ip:"));

    // Every request to the site shares the host key, so a host limit at or below
    // the per-IP limit would take the whole site down under normal traffic.
    expect(host!.limit).toBeGreaterThan(ip!.limit);
  });

  it("omits the ip rule when there is no IP", () => {
    const rules = buildNetworkRateLimitRules({ ...context, ipAddress: null });

    expect(rules.some((r) => r.key.startsWith("ip:"))).toBe(false);
  });

  it("still lets callers override the defaults", () => {
    const rules = buildNetworkRateLimitRules(context).map((rule) =>
      rule.key.startsWith("ip:") ? { ...rule, limit: 12 } : rule
    );

    expect(rules.find((r) => r.key.startsWith("ip:"))!.limit).toBe(12);
  });
});
