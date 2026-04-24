import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatBytes, truncateOneLine, relativeTime } from "./format";

describe("formatBytes", () => {
  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes below 1 KB", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats exactly 1 KB", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1_048_576)).toBe("1.0 MB");
  });

  it("formats fractional megabytes", () => {
    expect(formatBytes(2_621_440)).toBe("2.5 MB");
  });
});

describe("truncateOneLine", () => {
  it("returns short text unchanged", () => {
    expect(truncateOneLine("hello")).toBe("hello");
  });

  it("collapses internal newlines to spaces", () => {
    expect(truncateOneLine("hello\nworld")).toBe("hello world");
  });

  it("collapses multiple whitespace characters", () => {
    expect(truncateOneLine("a   \t  b")).toBe("a b");
  });

  it("trims leading and trailing whitespace", () => {
    expect(truncateOneLine("  hello  ")).toBe("hello");
  });

  it("does not truncate text at the exact limit", () => {
    const exact = "a".repeat(120);
    expect(truncateOneLine(exact, 120)).toBe(exact);
  });

  it("truncates text exceeding the limit and appends ellipsis", () => {
    const long = "a".repeat(200);
    const result = truncateOneLine(long, 120);
    expect(result).toHaveLength(120);
    expect(result.endsWith("…")).toBe(true);
  });

  it("respects a custom max length", () => {
    const result = truncateOneLine("hello world", 5);
    expect(result).toHaveLength(5);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("relativeTime", () => {
  const FIXED_NOW = new Date("2026-01-15T12:00:00.000Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for a timestamp under 60 seconds ago', () => {
    expect(relativeTime(FIXED_NOW - 30_000)).toBe("just now");
  });

  it('returns "just now" for a timestamp at exactly 0 ms ago', () => {
    expect(relativeTime(FIXED_NOW)).toBe("just now");
  });

  it("returns minutes for a timestamp under 1 hour ago", () => {
    expect(relativeTime(FIXED_NOW - 5 * 60_000)).toBe("5m ago");
    expect(relativeTime(FIXED_NOW - 59 * 60_000)).toBe("59m ago");
  });

  it("returns hours for a timestamp under 1 day ago", () => {
    expect(relativeTime(FIXED_NOW - 3 * 3_600_000)).toBe("3h ago");
    expect(relativeTime(FIXED_NOW - 23 * 3_600_000)).toBe("23h ago");
  });

  it("returns days for a timestamp under 1 week ago", () => {
    expect(relativeTime(FIXED_NOW - 2 * 86_400_000)).toBe("2d ago");
    expect(relativeTime(FIXED_NOW - 6 * 86_400_000)).toBe("6d ago");
  });

  it("returns a locale date string for timestamps older than 1 week", () => {
    const result = relativeTime(FIXED_NOW - 10 * 86_400_000);
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toMatch(/ago$/);
  });
});
