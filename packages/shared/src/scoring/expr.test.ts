import { describe, expect, it } from 'vitest';
import { compileExpr, evaluate, MAX_EXPR_LENGTH } from './expr.js';

const val = (src: string, scope: Record<string, number | number[]> = {}): number => {
  const r = evaluate(src, scope);
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.value;
};

const code = (src: string, scope: Record<string, number | number[]> = {}): string => {
  const r = evaluate(src, scope);
  return r.ok ? 'OK' : r.error.code;
};

describe('evaluator arithmetic', () => {
  it('respects precedence and associativity', () => {
    expect(val('1 + 2 * 3')).toBe(7);
    expect(val('(1 + 2) * 3')).toBe(9);
    expect(val('10 - 4 - 3')).toBe(3);
    expect(val('2 ** 3 ** 2')).toBe(512);
    expect(val('-2 ** 2')).toBe(-4);
    expect(val('2 ** -1')).toBe(0.5);
    expect(val('7 % 4')).toBe(3);
    expect(val('7 / 2')).toBe(3.5);
    expect(val('--3')).toBe(3);
    expect(val('.5 + 1')).toBe(1.5);
  });

  it('evaluates comparisons and logic to 0/1', () => {
    expect(val('3 > 2')).toBe(1);
    expect(val('3 <= 2')).toBe(0);
    expect(val('2 == 2 && 1 != 2')).toBe(1);
    expect(val('0 || 0')).toBe(0);
    expect(val('!0')).toBe(1);
    expect(val('!5')).toBe(0);
    expect(val('1 + (2 > 1)')).toBe(2);
  });

  it('supports ternary and if() lazily', () => {
    expect(val('1 ? 2 : 3')).toBe(2);
    expect(val('0 ? 2 : 1 ? 5 : 6')).toBe(5);
    expect(val('if(x > 1, 10, 20)', { x: 2 })).toBe(10);
    expect(val('if(1, 5, 1 / 0)')).toBe(5);
    expect(val('x == 4 ? 0 : (x == 0 ? 0 : 3)', { x: 2 })).toBe(3);
  });

  it('supports allowlisted functions', () => {
    expect(val('min(3, 1, 2)')).toBe(1);
    expect(val('max(3, 1, 2)')).toBe(3);
    expect(val('floor(2.9) + ceil(2.1) + round(2.5) + abs(-4)')).toBe(2 + 3 + 3 + 4);
    expect(val('sum(1, 2, 3)')).toBe(6);
    expect(val('count(1, 2, 3)')).toBe(3);
  });

  it('handles list values for repeating inputs', () => {
    expect(val('sum(value)', { value: [1, 2, 3] })).toBe(6);
    expect(val('count(value)', { value: [4, 4] })).toBe(2);
    expect(val('max(value, 10)', { value: [4, 40] })).toBe(40);
    expect(code('value * 2', { value: [1, 2] })).toBe('EXPR_TYPE');
    expect(code('floor(value)', { value: [1, 2] })).toBe('EXPR_TYPE');
  });

  it('returns 0 and a warning on division by zero', () => {
    const warnings: string[] = [];
    const r = evaluate('5 / x + 5 % x', { x: 0 }, warnings);
    expect(r).toEqual({ ok: true, value: 0 });
    expect(warnings).toHaveLength(2);
  });

  it('rejects non-finite results', () => {
    expect(code('0 ** -1')).toBe('EXPR_NON_FINITE');
    expect(code('9 ** 9 ** 9')).toBe('EXPR_NON_FINITE');
  });

  it('collects identifiers', () => {
    const c = compileExpr('floor((a + b) / 3) + cat_x * players');
    expect(c.ok && [...c.value.identifiers].sort()).toEqual(['a', 'b', 'cat_x', 'players']);
  });
});

describe('evaluator rejections', () => {
  it.each([
    ['constructor', 'EXPR_UNKNOWN_IDENTIFIER'],
    ['__proto__', 'EXPR_UNKNOWN_IDENTIFIER'],
    ['toString', 'EXPR_UNKNOWN_IDENTIFIER'],
    ['hasOwnProperty', 'EXPR_UNKNOWN_IDENTIFIER'],
    ['process', 'EXPR_UNKNOWN_IDENTIFIER'],
    ['this', 'EXPR_UNKNOWN_IDENTIFIER'],
    ['globalThis', 'EXPR_UNKNOWN_IDENTIFIER'],
    ['a.b', 'EXPR_SYNTAX'],
    ['value.length', 'EXPR_SYNTAX'],
    ['value[0]', 'EXPR_SYNTAX'],
    ['constructor.constructor("return 1")()', 'EXPR_SYNTAX'],
    ['x()', 'EXPR_UNKNOWN_FUNCTION'],
    ['constructor(1)', 'EXPR_UNKNOWN_FUNCTION'],
    ['eval(1)', 'EXPR_UNKNOWN_FUNCTION'],
    ['Function(1)', 'EXPR_UNKNOWN_FUNCTION'],
    ['import(1)', 'EXPR_UNKNOWN_FUNCTION'],
    ['pow(2, 3)', 'EXPR_UNKNOWN_FUNCTION'],
    ['toString(1)', 'EXPR_UNKNOWN_FUNCTION'],
    ['__proto__(1)', 'EXPR_UNKNOWN_FUNCTION'],
    ['Math.max(1)', 'EXPR_SYNTAX'],
    ['(1)(2)', 'EXPR_SYNTAX'],
    ['() => 1', 'EXPR_SYNTAX'],
    ["'abc'", 'EXPR_SYNTAX'],
    ['"abc"', 'EXPR_SYNTAX'],
    ['`1`', 'EXPR_SYNTAX'],
    ['{}', 'EXPR_SYNTAX'],
    ['[1]', 'EXPR_SYNTAX'],
    ['x = 1', 'EXPR_SYNTAX'],
    ['1; 2', 'EXPR_SYNTAX'],
    ['1 & 1', 'EXPR_SYNTAX'],
    ['1 | 1', 'EXPR_SYNTAX'],
    ['1 // 2', 'EXPR_SYNTAX'],
    ['\\u0061', 'EXPR_SYNTAX'],
    ['１', 'EXPR_SYNTAX'],
    ['1e5', 'EXPR_SYNTAX'],
    ['', 'EXPR_SYNTAX'],
    ['1 +', 'EXPR_SYNTAX'],
    ['(1', 'EXPR_SYNTAX'],
    ['1 ? 2', 'EXPR_SYNTAX'],
    ['min()', 'EXPR_ARITY'],
    ['floor(1, 2)', 'EXPR_ARITY'],
    ['if(1, 2)', 'EXPR_ARITY'],
    ['abs()', 'EXPR_ARITY'],
  ])('rejects %s', (src, expected) => {
    expect(code(src, { x: 1, value: 1 })).toBe(expected);
  });

  it('rejects over-long expressions', () => {
    expect(code('1+'.repeat(MAX_EXPR_LENGTH) + '1')).toBe('EXPR_TOO_LONG');
    expect(code('1 '.repeat(MAX_EXPR_LENGTH / 2))).not.toBe('EXPR_TOO_LONG');
  });

  it('rejects deep nesting', () => {
    expect(code('('.repeat(40) + '1' + ')'.repeat(40))).toBe('EXPR_DEPTH');
    expect(code('-'.repeat(40) + '1')).toBe('EXPR_DEPTH');
    expect(code('('.repeat(8) + '1' + ')'.repeat(8))).toBe('OK');
  });

  it('does not leak prototype members through scope lookup', () => {
    expect(code('constructor', {})).toBe('EXPR_UNKNOWN_IDENTIFIER');
    expect(code('x', {})).toBe('EXPR_UNKNOWN_IDENTIFIER');
  });

  it('never throws for arbitrary garbage', () => {
    const junk = ['(((', ')))', '?:', '**', '!!!!', ',,,', 'a b', '1 2', 'if(', 'sum(,)', '\u0000', '\n\t', '😀'];
    for (const j of junk) expect(() => compileExpr(j)).not.toThrow();
  });
});
