import { describe, it, expect } from "vitest";
import { tryEvaluate, formatResult } from "./calc";

describe("tryEvaluate — basic arithmetic", () => {
  it("adds", () => {
    expect(tryEvaluate("1+2")?.display).toBe("3");
  });

  it("subtracts", () => {
    expect(tryEvaluate("10 - 4")?.display).toBe("6");
  });

  it("multiplies and divides", () => {
    expect(tryEvaluate("6 * 7")?.display).toBe("42");
    expect(tryEvaluate("10/4")?.display).toBe("2.5");
  });

  it("respects operator precedence", () => {
    expect(tryEvaluate("2 + 3 * 4")?.display).toBe("14");
    expect(tryEvaluate("(2 + 3) * 4")?.display).toBe("20");
  });

  it("handles unary minus", () => {
    expect(tryEvaluate("-5 + 3")?.display).toBe("-2");
    expect(tryEvaluate("3 * -2")?.display).toBe("-6");
  });

  it("supports power (right-associative)", () => {
    expect(tryEvaluate("2^10")?.display).toBe("1024");
    expect(tryEvaluate("2^3^2")?.display).toBe("512"); // 2^(3^2) = 2^9
  });

  it("handles modulo", () => {
    expect(tryEvaluate("10 % 3")?.display).toBe("1");
  });
});

describe("tryEvaluate — numbers", () => {
  it("parses decimals", () => {
    expect(tryEvaluate("0.1 + 0.2")?.value).toBeCloseTo(0.3, 10);
  });

  it("parses leading-dot decimals", () => {
    expect(tryEvaluate(".5 + .5")?.display).toBe("1");
  });

  it("parses scientific notation", () => {
    expect(tryEvaluate("1e3 + 1")?.display).toBe("1001");
    expect(tryEvaluate("1.5e-2 * 100")?.value).toBeCloseTo(1.5, 10);
  });

  it("ignores underscore digit grouping", () => {
    expect(tryEvaluate("1_000 + 1")?.display).toBe("1001");
  });
});

describe("tryEvaluate — functions and constants", () => {
  it("evaluates sqrt", () => {
    expect(tryEvaluate("sqrt(16)")?.display).toBe("4");
  });

  it("evaluates trig in radians", () => {
    expect(tryEvaluate("sin(0)")?.display).toBe("0");
    expect(tryEvaluate("cos(pi)")?.display).toBe("-1");
  });

  it("evaluates pi and tau constants", () => {
    expect(tryEvaluate("pi")?.value).toBeCloseTo(Math.PI, 10);
    expect(tryEvaluate("tau / 2")?.value).toBeCloseTo(Math.PI, 10);
  });

  it("evaluates min/max with multiple args", () => {
    expect(tryEvaluate("min(3, 1, 2)")?.display).toBe("1");
    expect(tryEvaluate("max(3, 1, 2)")?.display).toBe("3");
  });

  it("evaluates log10 and ln", () => {
    expect(tryEvaluate("log(1000)")?.value).toBeCloseTo(3, 10);
    expect(tryEvaluate("ln(e)")?.value).toBeCloseTo(1, 10);
  });

  it("evaluates abs and floor/ceil", () => {
    expect(tryEvaluate("abs(-7)")?.display).toBe("7");
    expect(tryEvaluate("floor(2.9)")?.display).toBe("2");
    expect(tryEvaluate("ceil(2.1)")?.display).toBe("3");
  });
});

describe("tryEvaluate — gating", () => {
  it("returns null for plain numbers without operators", () => {
    expect(tryEvaluate("42")).toBeNull();
    expect(tryEvaluate("3.14")).toBeNull();
  });

  it("returns null for non-math input", () => {
    expect(tryEvaluate("hello")).toBeNull();
    expect(tryEvaluate("foo bar")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(tryEvaluate("")).toBeNull();
    expect(tryEvaluate("   ")).toBeNull();
  });

  it("returns null for non-finite results", () => {
    expect(tryEvaluate("1/0")).toBeNull();
  });

  it("forces calc mode with leading =", () => {
    expect(tryEvaluate("=42")?.display).toBe("42");
    expect(tryEvaluate("=pi")?.value).toBeCloseTo(Math.PI, 10);
  });

  it("returns null for malformed input", () => {
    expect(tryEvaluate("1 +")).toBeNull();
    expect(tryEvaluate("(1 + 2")).toBeNull();
    expect(tryEvaluate("foo(1)")).toBeNull();
  });

  it("recognises constants without an operator", () => {
    expect(tryEvaluate("pi")?.value).toBeCloseTo(Math.PI, 10);
  });
});

describe("formatResult", () => {
  it("formats integers without a decimal point", () => {
    expect(formatResult(42)).toBe("42");
    expect(formatResult(-7)).toBe("-7");
  });

  it("trims trailing zeros from decimals", () => {
    expect(formatResult(2.5)).toBe("2.5");
    expect(formatResult(0.1 + 0.2)).toBe("0.3");
  });

  it("preserves scientific notation for tiny/huge values", () => {
    expect(formatResult(1e-12)).toMatch(/e/);
  });
});
