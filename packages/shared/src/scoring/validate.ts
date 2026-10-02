import { compileExpr, type CompiledExpr } from './expr.js';
import { err, ok, type Result } from './result.js';
import { scoreTemplateSchema, type ScoreCategory, type ScoreTemplate } from './template-schema.js';

export interface CompiledTemplate {
  template: ScoreTemplate;
  order: ScoreCategory[];
  exprs: ReadonlyMap<string, CompiledExpr>;
}

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED_INPUTS = new Set(['value', 'players']);
const CAT_PREFIX = 'cat_';

function categoryExprSources(cat: ScoreCategory): { path: string; src: string }[] {
  const out: { path: string; src: string }[] = [];
  const f = cat.formula;
  if (f.expr !== undefined) out.push({ path: 'formula.expr', src: f.expr });
  for (const [k, o] of Object.entries(f.byPlayerCount ?? {})) {
    if (o.expr !== undefined) out.push({ path: `formula.byPlayerCount.${k}.expr`, src: o.expr });
  }
  if (cat.appliesWhen) out.push({ path: 'appliesWhen', src: cat.appliesWhen });
  return out;
}

function checkFormulaShape(cat: ScoreCategory): string | null {
  const f = cat.formula;
  if (cat.input === 'derived' && (f.type !== 'expr' || f.expr === undefined)) {
    return "input 'derived' requires an expr formula";
  }
  if (cat.roundInput !== undefined && cat.input !== 'perRound') return "roundInput requires input 'perRound'";
  const hasOverrides = Object.keys(f.byPlayerCount ?? {}).length > 0;
  if (hasOverrides) return null;
  switch (f.type) {
    case 'multiply':
      return f.points === undefined ? 'multiply requires formula.points' : null;
    case 'table':
      return f.table === undefined ? 'table requires formula.table' : null;
    case 'expr':
      return f.expr === undefined ? 'expr requires formula.expr' : null;
    case 'setCollection':
      return f.expr === undefined && f.table === undefined
        ? 'setCollection requires formula.expr or formula.table'
        : null;
    case 'rankAward':
      return f.rankAward === undefined ? 'rankAward requires formula.rankAward' : null;
    default:
      return null;
  }
}

export function compileTemplate(template: ScoreTemplate): Result<CompiledTemplate> {
  const byKey = new Map<string, ScoreCategory>();
  for (const [i, cat] of template.categories.entries()) {
    if (byKey.has(cat.key)) {
      return err('TEMPLATE_INVALID', `duplicate category key '${cat.key}'`, `categories[${i}].key`);
    }
    byKey.set(cat.key, cat);
  }

  const exprs = new Map<string, CompiledExpr>();
  const deps = new Map<string, Set<string>>();
  for (const cat of template.categories) deps.set(cat.key, new Set());

  for (const [i, cat] of template.categories.entries()) {
    const base = `categories[${i}]`;
    const shape = checkFormulaShape(cat);
    if (shape) return err('TEMPLATE_INVALID', shape, `${base}.formula`);

    const inputNames = new Set<string>();
    if (cat.input === 'counts') {
      if (!cat.inputs || cat.inputs.length === 0) {
        return err('TEMPLATE_INVALID', "input 'counts' requires non-empty inputs", `${base}.inputs`);
      }
      for (const name of cat.inputs) {
        if (!IDENT_RE.test(name) || RESERVED_INPUTS.has(name) || inputNames.has(name)) {
          return err('TEMPLATE_INVALID', `invalid or duplicate input name '${name}'`, `${base}.inputs`);
        }
        inputNames.add(name);
      }
    }

    for (const { path, src } of categoryExprSources(cat)) {
      const compiled = exprs.get(src) ?? (() => {
        const c = compileExpr(src);
        return c.ok ? c.value : c.error;
      })();
      if ('code' in compiled) {
        return err('TEMPLATE_INVALID', `${compiled.code}: ${compiled.message}`, `${base}.${path}`);
      }
      exprs.set(src, compiled);
      for (const id of compiled.identifiers) {
        if (id === 'value' || id === 'players' || inputNames.has(id)) continue;
        if (id.startsWith(CAT_PREFIX) && byKey.has(id.slice(CAT_PREFIX.length))) {
          deps.get(cat.key)?.add(id.slice(CAT_PREFIX.length));
          continue;
        }
        return err('TEMPLATE_INVALID', `unknown identifier '${id}'`, `${base}.${path}`);
      }
    }

    for (const target of cat.multiplierOf ?? []) {
      if (target === cat.key || !byKey.has(target)) {
        return err('TEMPLATE_INVALID', `invalid multiplierOf target '${target}'`, `${base}.multiplierOf`);
      }
      deps.get(target)?.add(cat.key);
    }
  }

  const topLevel: { path: string; src: string | null | undefined }[] = [
    { path: 'outcome.winWhen', src: template.outcome?.winWhen },
    { path: 'outcome.loseWhen', src: template.outcome?.loseWhen },
    { path: 'endCondition.when', src: template.endCondition?.when },
  ];
  for (const { path, src } of topLevel) {
    if (!src) continue;
    const c = compileExpr(src);
    if (!c.ok) return err('TEMPLATE_INVALID', `${c.error.code}: ${c.error.message}`, path);
    for (const id of c.value.identifiers) {
      if (id === 'players' || (id.startsWith(CAT_PREFIX) && byKey.has(id.slice(CAT_PREFIX.length)))) continue;
      return err('TEMPLATE_INVALID', `unknown identifier '${id}'`, path);
    }
    exprs.set(src, c.value);
  }

  for (const [i, tb] of (template.tiebreakers ?? []).entries()) {
    if (tb.categoryKey && !byKey.has(tb.categoryKey)) {
      return err('TEMPLATE_INVALID', `unknown tiebreaker category '${tb.categoryKey}'`, `tiebreakers[${i}]`);
    }
  }

  const order: ScoreCategory[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (key: string): string | null => {
    const s = state.get(key);
    if (s === 'done') return null;
    if (s === 'visiting') return key;
    state.set(key, 'visiting');
    for (const dep of deps.get(key) ?? []) {
      const cycle = visit(dep);
      if (cycle) return cycle;
    }
    state.set(key, 'done');
    order.push(byKey.get(key) as ScoreCategory);
    return null;
  };
  for (const cat of template.categories) {
    const cycle = visit(cat.key);
    if (cycle) return err('TEMPLATE_INVALID', `circular category reference at '${cycle}'`);
  }

  return ok({ template, order, exprs });
}

export function validateTemplate(raw: unknown): Result<CompiledTemplate> {
  const parsed = scoreTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err('TEMPLATE_INVALID', issue?.message ?? 'invalid template', issue?.path.join('.'));
  }
  return compileTemplate(parsed.data);
}
