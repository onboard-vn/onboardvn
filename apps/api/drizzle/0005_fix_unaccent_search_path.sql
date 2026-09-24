-- Custom SQL migration file, put your code below! -----
-- 0002 created `unaccent_immutable` calling unqualified `unaccent('unaccent', $1)`, which
-- resolves under the caller's search_path. `pg_dump` emits `SET search_path = ''` before
-- replaying the dump, so `pg_restore` fails to recreate the trigram indexes that call this
-- function. Schema-qualify both the function and its call, and pin its own search_path so it
-- behaves the same regardless of the caller's setting.
CREATE OR REPLACE FUNCTION public.unaccent_immutable(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public, pg_temp
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$;
