import { err, ok, type Result, type ScoreErrorCode } from './result.js';

export const MAX_EXPR_LENGTH = 500;
export const MAX_EXPR_DEPTH = 32;

export type ExprValue = number | readonly number[];

type BinOp =
  '+' | '-' | '*' | '/' | '%' | '**' | '<' | '<=' | '>' | '>=' | '==' | '!=' | '&&' | '||';

export type ExprNode =
  | { k: 'num'; v: number }
  | { k: 'id'; name: string }
  | { k: 'unary'; op: '-' | '+' | '!'; arg: ExprNode }
  | { k: 'bin'; op: BinOp; l: ExprNode; r: ExprNode }
  | { k: 'cond'; test: ExprNode; then: ExprNode; else: ExprNode }
  | { k: 'call'; fn: string; args: ExprNode[] };

export interface CompiledExpr {
  node: ExprNode;
  identifiers: ReadonlySet<string>;
}

export interface EvalContext {
  lookup(name: string): ExprValue | undefined;
  warnings: string[];
}

class ExprFailure {
  constructor(
    readonly code: ScoreErrorCode,
    readonly message: string,
  ) {}
}

const fail = (code: ScoreErrorCode, message: string): never => {
  throw new ExprFailure(code, message);
};

const FUNCTIONS: Readonly<Record<string, { min: number; max: number }>> = {
  min: { min: 1, max: Infinity },
  max: { min: 1, max: Infinity },
  floor: { min: 1, max: 1 },
  ceil: { min: 1, max: 1 },
  round: { min: 1, max: 1 },
  abs: { min: 1, max: 1 },
  sum: { min: 1, max: Infinity },
  count: { min: 1, max: Infinity },
  countTrue: { min: 1, max: Infinity },
  sumRounds: { min: 1, max: 1 },
};

type Token =
  { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string } | { t: 'end' };

const TOKEN_RE =
  /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|(\*\*|<=|>=|==|!=|&&|\|\||[-+*/%<>!?:(),]))/y;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  TOKEN_RE.lastIndex = 0;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    TOKEN_RE.lastIndex = pos;
    const m = TOKEN_RE.exec(src);
    if (!m) return fail('EXPR_SYNTAX', `unexpected character at ${pos}`);
    pos = TOKEN_RE.lastIndex;
    if (m[1] !== undefined) {
      const v = Number(m[1]);
      if (!Number.isFinite(v)) fail('EXPR_SYNTAX', 'number out of range');
      tokens.push({ t: 'num', v });
    } else if (m[2] !== undefined) tokens.push({ t: 'id', v: m[2] });
    else tokens.push({ t: 'op', v: m[3] as string });
  }
  tokens.push({ t: 'end' });
  return tokens;
}

class Parser {
  private i = 0;
  private depth = 0;
  readonly identifiers = new Set<string>();

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.i] as Token;
  }

  private isOp(v: string): boolean {
    const t = this.peek();
    return t.t === 'op' && t.v === v;
  }

  private expectOp(v: string): void {
    if (!this.isOp(v)) fail('EXPR_SYNTAX', `expected '${v}'`);
    this.i++;
  }

  private enter(): void {
    if (++this.depth > MAX_EXPR_DEPTH) fail('EXPR_DEPTH', `nesting deeper than ${MAX_EXPR_DEPTH}`);
  }

  parse(): ExprNode {
    const node = this.ternary();
    if (this.peek().t !== 'end') fail('EXPR_SYNTAX', 'unexpected trailing input');
    return node;
  }

  private ternary(): ExprNode {
    this.enter();
    const test = this.binary(0);
    let node = test;
    if (this.isOp('?')) {
      this.i++;
      const then = this.ternary();
      this.expectOp(':');
      node = { k: 'cond', test, then, else: this.ternary() };
    }
    this.depth--;
    return node;
  }

  private static readonly LEVELS: readonly (readonly BinOp[])[] = [
    ['||'],
    ['&&'],
    ['==', '!='],
    ['<', '<=', '>', '>='],
    ['+', '-'],
    ['*', '/', '%'],
  ];

  private binary(level: number): ExprNode {
    if (level === Parser.LEVELS.length) return this.unary();
    const ops = Parser.LEVELS[level] as readonly BinOp[];
    let left = this.binary(level + 1);
    for (;;) {
      const t = this.peek();
      const op = t.t === 'op' ? ops.find((o) => o === t.v) : undefined;
      if (!op) return left;
      this.i++;
      left = { k: 'bin', op, l: left, r: this.binary(level + 1) };
    }
  }

  private unary(): ExprNode {
    const t = this.peek();
    if (t.t === 'op' && (t.v === '-' || t.v === '+' || t.v === '!')) {
      this.enter();
      this.i++;
      const arg = this.unary();
      this.depth--;
      return { k: 'unary', op: t.v, arg };
    }
    const base = this.primary();
    if (this.isOp('**')) {
      this.i++;
      return { k: 'bin', op: '**', l: base, r: this.unary() };
    }
    return base;
  }

  private primary(): ExprNode {
    const t = this.peek();
    if (t.t === 'num') {
      this.i++;
      return { k: 'num', v: t.v };
    }
    if (t.t === 'id') {
      this.i++;
      if (this.isOp('(')) return this.call(t.v);
      this.identifiers.add(t.v);
      return { k: 'id', name: t.v };
    }
    if (this.isOp('(')) {
      this.i++;
      const inner = this.ternary();
      this.expectOp(')');
      return inner;
    }
    return fail('EXPR_SYNTAX', 'unexpected token');
  }

  private call(name: string): ExprNode {
    this.expectOp('(');
    const args: ExprNode[] = [];
    if (!this.isOp(')')) {
      args.push(this.ternary());
      while (this.isOp(',')) {
        this.i++;
        args.push(this.ternary());
      }
    }
    this.expectOp(')');
    if (name === 'if') {
      if (args.length !== 3) fail('EXPR_ARITY', 'if() takes 3 arguments');
      return {
        k: 'cond',
        test: args[0] as ExprNode,
        then: args[1] as ExprNode,
        else: args[2] as ExprNode,
      };
    }
    const spec = Object.hasOwn(FUNCTIONS, name) ? FUNCTIONS[name] : undefined;
    if (!spec) return fail('EXPR_UNKNOWN_FUNCTION', `function '${name}' is not allowed`);
    if (args.length < spec.min || args.length > spec.max) {
      fail('EXPR_ARITY', `${name}() got ${args.length} arguments`);
    }
    return { k: 'call', fn: name, args };
  }
}

export function compileExpr(src: string): Result<CompiledExpr> {
  if (typeof src !== 'string') return err('EXPR_SYNTAX', 'expression must be a string');
  if (src.length > MAX_EXPR_LENGTH) {
    return err('EXPR_TOO_LONG', `expression longer than ${MAX_EXPR_LENGTH} characters`);
  }
  try {
    const parser = new Parser(tokenize(src));
    const node = parser.parse();
    return ok({ node, identifiers: parser.identifiers });
  } catch (e) {
    if (e instanceof ExprFailure) return err(e.code, e.message);
    return err('INTERNAL', e instanceof Error ? e.message : 'unexpected error');
  }
}

const flatten = (vals: ExprValue[]): number[] =>
  vals.flatMap((v) => (typeof v === 'number' ? [v] : [...v]));

function finite(n: number): number {
  return Number.isFinite(n) ? n : fail('EXPR_NON_FINITE', 'result is not a finite number');
}

function evalNode(node: ExprNode, ctx: EvalContext): ExprValue {
  const num = (n: ExprNode): number => {
    const v = evalNode(n, ctx);
    return typeof v === 'number' ? v : fail('EXPR_TYPE', 'list used where a number is required');
  };
  switch (node.k) {
    case 'num':
      return node.v;
    case 'id': {
      const v = ctx.lookup(node.name);
      return v === undefined
        ? fail('EXPR_UNKNOWN_IDENTIFIER', `unknown identifier '${node.name}'`)
        : v;
    }
    case 'unary': {
      const v = num(node.arg);
      return node.op === '-' ? -v : node.op === '+' ? v : v === 0 ? 1 : 0;
    }
    case 'cond':
      return num(node.test) !== 0 ? evalNode(node.then, ctx) : evalNode(node.else, ctx);
    case 'bin': {
      if (node.op === '&&') return num(node.l) !== 0 && num(node.r) !== 0 ? 1 : 0;
      if (node.op === '||') return num(node.l) !== 0 || num(node.r) !== 0 ? 1 : 0;
      const l = num(node.l);
      const r = num(node.r);
      switch (node.op) {
        case '+':
          return finite(l + r);
        case '-':
          return finite(l - r);
        case '*':
          return finite(l * r);
        case '**':
          return finite(l ** r);
        case '/':
        case '%':
          if (r === 0) {
            ctx.warnings.push(`division by zero in '${node.op}'`);
            return 0;
          }
          return finite(node.op === '/' ? l / r : l % r);
        case '<':
          return l < r ? 1 : 0;
        case '<=':
          return l <= r ? 1 : 0;
        case '>':
          return l > r ? 1 : 0;
        case '>=':
          return l >= r ? 1 : 0;
        case '==':
          return l === r ? 1 : 0;
        default:
          return l !== r ? 1 : 0;
      }
    }
    case 'call': {
      const args = node.args.map((a) => evalNode(a, ctx));
      if (node.fn === 'count') return flatten(args).length;
      if (node.fn === 'countTrue') return flatten(args).filter((n) => n !== 0).length;
      if (node.fn === 'sum' || node.fn === 'sumRounds')
        return finite(flatten(args).reduce((a, b) => a + b, 0));
      if (node.fn === 'min' || node.fn === 'max') {
        const list = flatten(args);
        if (list.length === 0) return 0;
        return node.fn === 'min' ? Math.min(...list) : Math.max(...list);
      }
      const x = args[0];
      if (typeof x !== 'number') return fail('EXPR_TYPE', 'list used where a number is required');
      if (node.fn === 'floor') return Math.floor(x);
      if (node.fn === 'ceil') return Math.ceil(x);
      if (node.fn === 'round') return Math.round(x);
      return Math.abs(x);
    }
  }
}

export function evaluateExpr(expr: CompiledExpr, ctx: EvalContext): Result<number> {
  try {
    const v = evalNode(expr.node, ctx);
    if (typeof v !== 'number') return err('EXPR_TYPE', 'expression must evaluate to a number');
    return ok(finite(v));
  } catch (e) {
    if (e instanceof ExprFailure) return err(e.code, e.message);
    return err('INTERNAL', e instanceof Error ? e.message : 'unexpected error');
  }
}

export function evaluate(
  src: string,
  scope: Readonly<Record<string, ExprValue>>,
  warnings: string[] = [],
): Result<number> {
  const compiled = compileExpr(src);
  if (!compiled.ok) return compiled;
  return evaluateExpr(compiled.value, {
    lookup: (name) => (Object.hasOwn(scope, name) ? scope[name] : undefined),
    warnings,
  });
}
