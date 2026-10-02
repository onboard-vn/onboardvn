export type ScoreErrorCode =
  | 'EXPR_TOO_LONG'
  | 'EXPR_SYNTAX'
  | 'EXPR_DEPTH'
  | 'EXPR_UNKNOWN_IDENTIFIER'
  | 'EXPR_UNKNOWN_FUNCTION'
  | 'EXPR_ARITY'
  | 'EXPR_TYPE'
  | 'EXPR_NON_FINITE'
  | 'TEMPLATE_INVALID'
  | 'INPUT_INVALID'
  | 'INTERNAL';

export interface ScoreError {
  code: ScoreErrorCode;
  message: string;
  path?: string;
}

export type Result<T, E = ScoreError> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = (code: ScoreErrorCode, message: string, path?: string): Result<never> => ({
  ok: false,
  error: path === undefined ? { code, message } : { code, message, path },
});
