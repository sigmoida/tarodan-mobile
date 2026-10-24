/**
 * Mobile Sentry trace sampling per environment. Mirrors the mobile column of the
 * `@tarodan/logger` `sentrySampling` table in tarodan-app: production 0.1, staging
 * 0.02, development 0.
 */
import { tracesSampleRate } from "../sentrySampling";

describe("tracesSampleRate", () => {
  it.each([
    ["production", 0.1],
    ["staging", 0.02],
    ["development", 0],
  ] as const)("%s samples %s of traces", (environment, rate) => {
    expect(tracesSampleRate(environment)).toBe(rate);
  });

  it("never samples more in staging than in production", () => {
    expect(tracesSampleRate("staging")).toBeLessThan(
      tracesSampleRate("production"),
    );
  });

  it("falls back to 0 for an unknown environment", () => {
    expect(tracesSampleRate("qa" as never)).toBe(0);
  });
});
