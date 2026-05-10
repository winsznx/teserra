import { describe, expect, it } from "vitest";

import {
  bytesToHex,
  expiredRelative,
  formatBytes,
  formatDate,
  formatRange,
  formatThresholdAtomic,
} from "../../components/seal-card-format";

describe("formatThresholdAtomic", () => {
  it("renders whole-unit values with .00 cents", () => {
    // #then
    expect(formatThresholdAtomic(BigInt(1_000_000))).toBe("1.00");
    expect(formatThresholdAtomic(BigInt(0))).toBe("0.00");
  });

  it("formats large amounts with thousands separators", () => {
    // #then  (atomic units: 3,000,000,000 / 10^6 = 3,000.00 USDC)
    expect(formatThresholdAtomic(BigInt(3_000_000_000))).toBe("3,000.00");
    expect(formatThresholdAtomic(BigInt(1_500_000))).toBe("1.50");
  });

  it("truncates fractional units to 2 decimals", () => {
    // #then  (1.234567 → 1.23)
    expect(formatThresholdAtomic(BigInt(1_234_567))).toBe("1.23");
  });
});

describe("formatDate / formatRange", () => {
  it("returns em-dash for invalid timestamps", () => {
    // #then
    expect(formatDate(0)).toBe("—");
    expect(formatDate(Number.NaN)).toBe("—");
    expect(formatRange(0, 100)).toBe("—");
    expect(formatRange(100, 0)).toBe("—");
  });

  it("renders both endpoints in the range", () => {
    // #given
    const start = 1_704_067_200; // 2024-01-01 UTC
    const end = 1_719_792_000;  // 2024-07-01 UTC
    // #when
    const formatted = formatRange(start, end);
    // #then
    expect(formatted).toMatch(/Jan/);
    expect(formatted).toMatch(/—/);
    expect(formatted).toMatch(/2024/);
  });
});

describe("formatBytes", () => {
  it("returns em-dash for empty byte arrays", () => {
    // #then
    expect(formatBytes(new Uint8Array(0))).toBe("—");
  });

  it("formats a 32-byte hash with first6 + last4 hex digits", () => {
    // #given
    const buf = new Uint8Array(32);
    buf[0] = 0xab;
    buf[1] = 0xcd;
    buf[2] = 0xef;
    buf[31] = 0x42;
    // #when
    const result = formatBytes(buf);
    // #then
    expect(result).toMatch(/^abcdef\.\.\..{4}$/);
    expect(result.endsWith("0042")).toBe(true);
  });
});

describe("bytesToHex", () => {
  it("emits lowercase hex with no separator", () => {
    // #given
    const buf = Uint8Array.from([0xde, 0xad, 0xbe, 0xef]);
    // #when/#then
    expect(bytesToHex(buf)).toBe("deadbeef");
  });
});

describe("expiredRelative", () => {
  const now = 1_700_000_000;

  it("returns 'soon' when expires_at is still in the future", () => {
    // #when/#then
    expect(expiredRelative(now + 100, now)).toBe("soon");
  });

  it("formats hour deltas under a day", () => {
    // #when/#then
    expect(expiredRelative(now - 7200, now)).toBe("2 hours ago");
  });

  it("formats day deltas under a month", () => {
    // #when/#then
    expect(expiredRelative(now - 86_400 * 12, now)).toBe("12 days ago");
  });

  it("formats month deltas under a year", () => {
    // #when/#then
    expect(expiredRelative(now - 86_400 * 60, now)).toBe("2 months ago");
  });
});
