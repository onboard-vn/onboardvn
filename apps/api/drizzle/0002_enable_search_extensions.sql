CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
-- unaccent() is STABLE (depends on search_path), so wrap it IMMUTABLE for use in an index expression.
CREATE OR REPLACE FUNCTION unaccent_immutable(text)
RETURNS text AS $$
  SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;
--> statement-breakpoint
CREATE INDEX "games_name_en_trgm_idx" ON "games" USING gin (unaccent_immutable("name_en") gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "games_name_vi_trgm_idx" ON "games" USING gin (unaccent_immutable(coalesce("name_vi", '')) gin_trgm_ops);
