export const USDC_DECIMALS = 6;

export function formatThresholdAtomic(atomic: bigint): string {
  const divisor = BigInt(10) ** BigInt(USDC_DECIMALS);
  const whole = atomic / divisor;
  const frac = atomic % divisor;
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (frac === BigInt(0)) return `${wholeStr}.00`;
  const fracStr = frac.toString().padStart(USDC_DECIMALS, "0");
  return `${wholeStr}.${fracStr.slice(0, 2)}`;
}

export function formatDate(unix: number): string {
  if (!Number.isFinite(unix) || unix <= 0) return "—";
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRange(startTs: number, endTs: number): string {
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || startTs <= 0 || endTs <= 0) return "—";
  return `${formatDate(startTs)} — ${formatDate(endTs)}`;
}

export function formatBytes(bytes: Uint8Array): string {
  if (!bytes || bytes.length === 0) return "—";
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 6)}...${hex.slice(-4)}`;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function expiredRelative(
  expiresAt: number,
  now = Math.floor(Date.now() / 1000),
): string {
  const delta = now - expiresAt;
  if (delta <= 0) return "soon";
  if (delta < 86_400) return `${Math.floor(delta / 3600)} hours ago`;
  if (delta < 86_400 * 30) return `${Math.floor(delta / 86_400)} days ago`;
  if (delta < 86_400 * 365) return `${Math.floor(delta / (86_400 * 30))} months ago`;
  return `${Math.floor(delta / (86_400 * 365))} years ago`;
}
