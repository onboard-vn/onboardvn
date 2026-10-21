ALTER TABLE "games" ADD COLUMN "canonical_id" uuid;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "variant_of_id" uuid;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_canonical_id_games_id_fk" FOREIGN KEY ("canonical_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_variant_of_id_games_id_fk" FOREIGN KEY ("variant_of_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_canonical_id_idx" ON "games" USING btree ("canonical_id");--> statement-breakpoint
CREATE INDEX "games_variant_of_id_idx" ON "games" USING btree ("variant_of_id");--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_canonical_not_self" CHECK ("games"."canonical_id" is null or "games"."canonical_id" <> "games"."id");--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_variant_not_self" CHECK ("games"."variant_of_id" is null or "games"."variant_of_id" <> "games"."id");
--> statement-breakpoint
CREATE FUNCTION resolve_canonical_game_id(input_id uuid) RETURNS uuid LANGUAGE plpgsql VOLATILE AS $$
DECLARE current_id uuid := input_id; next_id uuid; visited uuid[] := ARRAY[]::uuid[];
BEGIN
  WHILE current_id IS NOT NULL LOOP
    IF current_id = ANY(visited) THEN RAISE EXCEPTION 'Cyclic game identity'; END IF;
    visited := array_append(visited, current_id);
    SELECT canonical_id INTO next_id FROM games WHERE id = current_id;
    IF next_id IS NULL THEN RETURN current_id; END IF;
    current_id := next_id;
  END LOOP;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION canonicalize_game_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.game_id := resolve_canonical_game_id(NEW.game_id); RETURN NEW; END;
$$;
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['user_games','user_wishlist','cafe_games','cafe_game_events','club_external_ownerships','game_categories','game_barcodes','game_external_metadata','score_templates','plays','meetup_tables'] LOOP
    EXECUTE format('CREATE TRIGGER canonicalize_game_reference BEFORE INSERT OR UPDATE OF game_id ON %I FOR EACH ROW EXECUTE FUNCTION canonicalize_game_reference()', table_name);
  END LOOP;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION protect_game_tombstone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.canonical_id IS NOT NULL THEN RAISE EXCEPTION 'Merged game identity must be retained'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.canonical_id IS NOT NULL AND
    (to_jsonb(NEW) - 'canonical_id' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'canonical_id' - 'updated_at') THEN
    RAISE EXCEPTION 'Merged game identity is immutable';
  END IF;
  IF NEW.canonical_id IS NOT NULL AND (NEW.canonical_id = NEW.id OR
    resolve_canonical_game_id(NEW.canonical_id) <> NEW.canonical_id) THEN
    RAISE EXCEPTION 'Canonical game must be an active different game';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER protect_game_tombstone BEFORE UPDATE OR DELETE ON games
FOR EACH ROW EXECUTE FUNCTION protect_game_tombstone();
