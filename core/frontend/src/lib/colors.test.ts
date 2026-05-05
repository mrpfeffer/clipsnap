import { describe, it, expect } from "vitest";
import { readableForeground, rgbToHsl, tryParseColor } from "./colors";

describe("tryParseColor — happy paths", () => {
  it("parses 6-digit hex with hash", () => {
    const c = tryParseColor("#3366FF")!;
    expect(c.hex).toBe("#3366FF");
    expect(c.r).toBe(0x33);
    expect(c.g).toBe(0x66);
    expect(c.b).toBe(0xff);
    expect(c.a).toBe(1);
  });

  it("parses 6-digit hex without hash", () => {
    const c = tryParseColor("3366FF")!;
    expect(c.hex).toBe("#3366FF");
  });

  it("parses 3-digit hex (with hash, expanded)", () => {
    const c = tryParseColor("#abc")!;
    expect(c.hex).toBe("#AABBCC");
    expect(c.r).toBe(0xaa);
    expect(c.g).toBe(0xbb);
    expect(c.b).toBe(0xcc);
  });

  it("parses 4-digit hex (RGBA short form)", () => {
    const c = tryParseColor("#abcf")!;
    expect(c.r).toBe(0xaa);
    expect(c.a).toBe(1); // 0xff / 255 = 1.0
    // Fully opaque → no alpha in canonical
    expect(c.hex).toBe("#AABBCC");
  });

  it("parses 8-digit hex with alpha", () => {
    const c = tryParseColor("#3366FF80")!;
    expect(c.r).toBe(0x33);
    expect(c.b).toBe(0xff);
    expect(c.a).toBeCloseTo(0x80 / 255, 3);
    // Canonical includes alpha when < 1
    expect(c.hex).toBe("#3366FF80");
  });

  it("parses 8-digit hex without hash", () => {
    const c = tryParseColor("3366FF80")!;
    expect(c.hex).toBe("#3366FF80");
  });

  it("normalises lowercase to uppercase", () => {
    expect(tryParseColor("#abcdef")!.hex).toBe("#ABCDEF");
    expect(tryParseColor("abcdef")!.hex).toBe("#ABCDEF");
  });

  it("handles surrounding whitespace", () => {
    expect(tryParseColor("  #ff0000  ")!.hex).toBe("#FF0000");
  });
});

describe("tryParseColor — strict rejection", () => {
  it("rejects 3-digit hex without hash (too ambiguous)", () => {
    expect(tryParseColor("abc")).toBeNull();
    expect(tryParseColor("fed")).toBeNull();
    expect(tryParseColor("f00")).toBeNull();
  });

  it("rejects 4-digit hex without hash (too ambiguous)", () => {
    expect(tryParseColor("abcf")).toBeNull();
    expect(tryParseColor("f00d")).toBeNull();
  });

  it("rejects non-hex chars", () => {
    expect(tryParseColor("#xyzabc")).toBeNull();
    expect(tryParseColor("#3366GG")).toBeNull();
  });

  it("rejects invalid lengths", () => {
    expect(tryParseColor("#12")).toBeNull();
    expect(tryParseColor("#12345")).toBeNull();
    expect(tryParseColor("#1234567")).toBeNull();
    expect(tryParseColor("#123456789")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(tryParseColor("")).toBeNull();
    expect(tryParseColor("   ")).toBeNull();
    expect(tryParseColor("#")).toBeNull();
  });

  it("rejects mixed alphanumeric search-like queries", () => {
    expect(tryParseColor("hello world")).toBeNull();
    expect(tryParseColor("note-12")).toBeNull();
    expect(tryParseColor("#hello")).toBeNull();
  });
});

describe("rgb / hsl conversions", () => {
  it("converts pure red", () => {
    const hsl = rgbToHsl(255, 0, 0);
    expect(hsl).toEqual({ h: 0, s: 100, l: 50 });
  });

  it("converts pure green", () => {
    const hsl = rgbToHsl(0, 255, 0);
    expect(hsl).toEqual({ h: 120, s: 100, l: 50 });
  });

  it("converts pure blue", () => {
    const hsl = rgbToHsl(0, 0, 255);
    expect(hsl).toEqual({ h: 240, s: 100, l: 50 });
  });

  it("converts white (no saturation)", () => {
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 });
  });

  it("converts black", () => {
    expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 });
  });

  it("converts mid-gray", () => {
    expect(rgbToHsl(128, 128, 128)).toEqual({ h: 0, s: 0, l: 50 });
  });

  it("formats RGB string", () => {
    expect(tryParseColor("#3366FF")!.rgbString).toBe("rgb(51, 102, 255)");
  });

  it("formats RGB string with alpha", () => {
    const c = tryParseColor("#3366FF80")!;
    expect(c.rgbString).toMatch(/^rgba\(51, 102, 255, 0\.50?\)$/);
  });
});

describe("readableForeground", () => {
  it("returns black on light backgrounds", () => {
    expect(readableForeground(255, 255, 255)).toBe("#000000");
    expect(readableForeground(255, 255, 0)).toBe("#000000");
  });

  it("returns white on dark backgrounds", () => {
    expect(readableForeground(0, 0, 0)).toBe("#FFFFFF");
    expect(readableForeground(33, 33, 33)).toBe("#FFFFFF");
    expect(readableForeground(0, 0, 255)).toBe("#FFFFFF");
  });
});
