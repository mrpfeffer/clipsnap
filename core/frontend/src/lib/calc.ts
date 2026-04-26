// Tiny, safe expression evaluator — Alfred-style inline calculator.
//
// Supported:
//   numbers (incl. 1_000, 1.5, 1e3, .5)
//   + - * / % ^   (^ right-associative)
//   unary + / -
//   parens
//   constants: pi, π, tau, e
//   functions: sqrt, cbrt, abs, sign, floor, ceil, round,
//              ln, log (base 10), log2, exp,
//              sin, cos, tan, asin, acos, atan, atan2,
//              sinh, cosh, tanh,
//              min, max, pow, mod
//
// `tryEvaluate(input)` returns a formatted string when the input both
// parses and looks like an actual math expression (has at least one
// operator, function call, or constant). Plain inputs like "42" or
// "hello" return null so the search list isn't polluted.

type Token =
  | { kind: "num"; value: number }
  | { kind: "op"; value: "+" | "-" | "*" | "/" | "%" | "^" }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" }
  | { kind: "ident"; value: string };

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  "π": Math.PI,
  tau: Math.PI * 2,
  e: Math.E,
};

const FUNCTIONS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  sign: Math.sign,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  mod: (a: number, b: number) => a - b * Math.floor(a / b),
};

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = src.replace(/_/g, ""); // allow 1_000 grouping
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (c === "(" ) { tokens.push({ kind: "lparen" }); i++; continue; }
    if (c === ")") { tokens.push({ kind: "rparen" }); i++; continue; }
    if (c === ",") { tokens.push({ kind: "comma" }); i++; continue; }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "%" || c === "^") {
      tokens.push({ kind: "op", value: c });
      i++;
      continue;
    }
    if ((c >= "0" && c <= "9") || c === ".") {
      let j = i;
      while (
        j < s.length &&
        ((s[j] >= "0" && s[j] <= "9") || s[j] === ".")
      ) j++;
      // optional exponent: e/E [+/-] digits
      if (j < s.length && (s[j] === "e" || s[j] === "E")) {
        let k = j + 1;
        if (k < s.length && (s[k] === "+" || s[k] === "-")) k++;
        if (k < s.length && s[k] >= "0" && s[k] <= "9") {
          while (k < s.length && s[k] >= "0" && s[k] <= "9") k++;
          j = k;
        }
      }
      const numStr = s.slice(i, j);
      const num = Number(numStr);
      if (!Number.isFinite(num)) throw new Error(`bad number "${numStr}"`);
      tokens.push({ kind: "num", value: num });
      i = j;
      continue;
    }
    // identifier (letters / unicode π)
    if (/[A-Za-zπ_]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9π_]/.test(s[j])) j++;
      tokens.push({ kind: "ident", value: s.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    throw new Error(`unexpected character "${c}"`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  /** Whether the parsed expression contains anything beyond a bare literal. */
  hasOperator = false;
  hasFunction = false;
  hasConstant = false;

  constructor(private readonly tokens: Token[]) {}

  parse(): number {
    const v = this.parseExpr();
    if (this.pos !== this.tokens.length) {
      throw new Error(`unexpected token at position ${this.pos}`);
    }
    return v;
  }

  // expr := term (('+' | '-') term)*
  private parseExpr(): number {
    let left = this.parseTerm();
    while (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      if (t.kind !== "op" || (t.value !== "+" && t.value !== "-")) break;
      this.pos++;
      this.hasOperator = true;
      const right = this.parseTerm();
      left = t.value === "+" ? left + right : left - right;
    }
    return left;
  }

  // term := power (('*' | '/' | '%') power)*
  private parseTerm(): number {
    let left = this.parsePower();
    while (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      if (t.kind !== "op" || (t.value !== "*" && t.value !== "/" && t.value !== "%")) break;
      this.pos++;
      this.hasOperator = true;
      const right = this.parsePower();
      if (t.value === "*") left = left * right;
      else if (t.value === "/") left = left / right;
      else left = left - right * Math.floor(left / right);
    }
    return left;
  }

  // power := unary ('^' power)?     (right-associative)
  private parsePower(): number {
    const base = this.parseUnary();
    const t = this.tokens[this.pos];
    if (t && t.kind === "op" && t.value === "^") {
      this.pos++;
      this.hasOperator = true;
      const exp = this.parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  // unary := ('+' | '-') unary | atom
  private parseUnary(): number {
    const t = this.tokens[this.pos];
    if (t && t.kind === "op" && (t.value === "+" || t.value === "-")) {
      this.pos++;
      const v = this.parseUnary();
      return t.value === "-" ? -v : v;
    }
    return this.parseAtom();
  }

  // atom := number
  //       | ident '(' expr (',' expr)* ')'
  //       | ident                          (constant)
  //       | '(' expr ')'
  private parseAtom(): number {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("unexpected end of input");

    if (t.kind === "num") {
      this.pos++;
      return t.value;
    }

    if (t.kind === "lparen") {
      this.pos++;
      const v = this.parseExpr();
      const close = this.tokens[this.pos];
      if (!close || close.kind !== "rparen") throw new Error("missing ')'");
      this.pos++;
      this.hasOperator = true; // parens count as structure
      return v;
    }

    if (t.kind === "ident") {
      this.pos++;
      const next = this.tokens[this.pos];
      if (next && next.kind === "lparen") {
        // function call
        this.pos++;
        const args: number[] = [];
        if (this.tokens[this.pos] && this.tokens[this.pos].kind !== "rparen") {
          args.push(this.parseExpr());
          while (this.tokens[this.pos] && this.tokens[this.pos].kind === "comma") {
            this.pos++;
            args.push(this.parseExpr());
          }
        }
        const close = this.tokens[this.pos];
        if (!close || close.kind !== "rparen") throw new Error("missing ')'");
        this.pos++;
        const fn = FUNCTIONS[t.value];
        if (!fn) throw new Error(`unknown function "${t.value}"`);
        this.hasFunction = true;
        return fn(...args);
      }
      // constant
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, t.value)) {
        this.hasConstant = true;
        return CONSTANTS[t.value];
      }
      throw new Error(`unknown identifier "${t.value}"`);
    }

    throw new Error(`unexpected token`);
  }
}

/** Format a number for display: integers as-is, decimals trimmed. */
export function formatResult(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e16) return n.toString();
  // 12 significant digits, then trim trailing zeros / lone dot.
  let s = n.toPrecision(12);
  if (s.includes("e") || s.includes("E")) return s;
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

export interface CalcResult {
  /** Original user input (trimmed). */
  expression: string;
  /** Numeric result. */
  value: number;
  /** Display-formatted result. */
  display: string;
}

/**
 * Try to evaluate `input` as a math expression.
 *
 * Returns `null` when the input doesn't parse, doesn't have any
 * operator / function / constant (so plain "42" is not treated as
 * a calc result), or evaluates to a non-finite number (1/0, NaN).
 *
 * A leading `=` forces calc mode and is stripped before parsing —
 * useful for forcing a single-number "expression" to display.
 */
export function tryEvaluate(input: string): CalcResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const forced = trimmed.startsWith("=");
  const src = forced ? trimmed.slice(1).trim() : trimmed;
  if (!src) return null;

  let tokens: Token[];
  try {
    tokens = tokenize(src);
  } catch {
    return null;
  }
  if (tokens.length === 0) return null;

  const parser = new Parser(tokens);
  let value: number;
  try {
    value = parser.parse();
  } catch {
    return null;
  }

  if (!Number.isFinite(value)) return null;

  // Without `=` prefix, require some structure so plain "42" isn't a result.
  if (!forced && !parser.hasOperator && !parser.hasFunction && !parser.hasConstant) {
    return null;
  }

  return { expression: trimmed, value, display: formatResult(value) };
}
