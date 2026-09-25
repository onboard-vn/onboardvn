ALTER TABLE "cafes" ADD COLUMN "venue_type" text DEFAULT 'boardgame_cafe' NOT NULL;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "amenities" jsonb;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "fee_model" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "fee_note" text;--> statement-breakpoint
CREATE INDEX "cafes_venue_type_idx" ON "cafes" USING btree ("venue_type");--> statement-breakpoint
CREATE INDEX "cafes_fee_model_idx" ON "cafes" USING btree ("fee_model");--> statement-breakpoint
CREATE INDEX "cafes_amenities_gin_idx" ON "cafes" USING gin ("amenities" jsonb_path_ops);--> statement-breakpoint
-- Best-effort conversion of any pre-existing `openingHours` shape into the new Google-Maps-style
-- per-day ranges. Handles every legacy shape seen in the wild: the app-written
-- `{"general": "..."}`, a hand-edited `{"mon": "8:00-22:00", ...}`, or anything else with
-- string values. Every row whose value under a recognized day key isn't already an array is
-- rewritten; a row already in the new shape (day keys are arrays, `note` is a string) is left
-- untouched. All text values are ALWAYS preserved verbatim in `note`; every "H:MM-H:MM" range
-- found in that text is ALSO parsed (multiple ranges per string are all kept), with "24:00"
-- mapped to "00:00". A range under a day-named key ("mon".."sun") applies only to that day; a
-- range under any other key (e.g. "general") applies to every day.
DO $$
DECLARE
  r RECORD;
  kv RECORD;
  day_keys TEXT[] := ARRAY['mon','tue','wed','thu','fri','sat','sun'];
  needs_conversion BOOLEAN;
  txt TEXT;
  notes TEXT[];
  ranges_mon JSONB; ranges_tue JSONB; ranges_wed JSONB; ranges_thu JSONB;
  ranges_fri JSONB; ranges_sat JSONB; ranges_sun JSONB;
  new_range JSONB;
  m TEXT[];
  open_h TEXT; open_t TEXT; close_h TEXT; close_t TEXT;
  key_lc TEXT;
BEGIN
  FOR r IN SELECT id, opening_hours FROM cafes WHERE opening_hours IS NOT NULL LOOP
    needs_conversion := FALSE;
    FOR kv IN SELECT key, value FROM jsonb_each(r.opening_hours) LOOP
      IF kv.key = ANY(day_keys) THEN
        IF jsonb_typeof(kv.value) <> 'array' THEN needs_conversion := TRUE; END IF;
      ELSIF kv.key = 'note' THEN
        IF jsonb_typeof(kv.value) <> 'string' THEN needs_conversion := TRUE; END IF;
      ELSE
        needs_conversion := TRUE;
      END IF;
    END LOOP;
    IF NOT needs_conversion THEN CONTINUE; END IF;

    ranges_mon := '[]'::jsonb; ranges_tue := '[]'::jsonb; ranges_wed := '[]'::jsonb;
    ranges_thu := '[]'::jsonb; ranges_fri := '[]'::jsonb; ranges_sat := '[]'::jsonb; ranges_sun := '[]'::jsonb;
    notes := ARRAY[]::TEXT[];

    FOR kv IN SELECT key, value FROM jsonb_each(r.opening_hours) LOOP
      -- Already-valid day arrays pass through so a partially-migrated row isn't lost.
      IF kv.key = ANY(day_keys) AND jsonb_typeof(kv.value) = 'array' THEN
        CASE kv.key
          WHEN 'mon' THEN ranges_mon := kv.value; WHEN 'tue' THEN ranges_tue := kv.value;
          WHEN 'wed' THEN ranges_wed := kv.value; WHEN 'thu' THEN ranges_thu := kv.value;
          WHEN 'fri' THEN ranges_fri := kv.value; WHEN 'sat' THEN ranges_sat := kv.value;
          WHEN 'sun' THEN ranges_sun := kv.value;
        END CASE;
        CONTINUE;
      END IF;

      IF jsonb_typeof(kv.value) <> 'string' THEN CONTINUE; END IF;
      txt := kv.value #>> '{}';
      notes := notes || txt;
      key_lc := lower(kv.key);

      FOR m IN SELECT regexp_matches(txt, '(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})', 'g') LOOP
        open_h := lpad(m[1], 2, '0');
        close_h := lpad(m[3], 2, '0');
        open_t := CASE WHEN open_h = '24' THEN '00:00' ELSE open_h || ':' || m[2] END;
        close_t := CASE WHEN close_h = '24' THEN '00:00' ELSE close_h || ':' || m[4] END;
        new_range := jsonb_build_array(jsonb_build_object('open', open_t, 'close', close_t));

        IF key_lc = ANY(day_keys) THEN
          CASE key_lc
            WHEN 'mon' THEN ranges_mon := ranges_mon || new_range; WHEN 'tue' THEN ranges_tue := ranges_tue || new_range;
            WHEN 'wed' THEN ranges_wed := ranges_wed || new_range; WHEN 'thu' THEN ranges_thu := ranges_thu || new_range;
            WHEN 'fri' THEN ranges_fri := ranges_fri || new_range; WHEN 'sat' THEN ranges_sat := ranges_sat || new_range;
            WHEN 'sun' THEN ranges_sun := ranges_sun || new_range;
          END CASE;
        ELSE
          ranges_mon := ranges_mon || new_range; ranges_tue := ranges_tue || new_range;
          ranges_wed := ranges_wed || new_range; ranges_thu := ranges_thu || new_range;
          ranges_fri := ranges_fri || new_range; ranges_sat := ranges_sat || new_range;
          ranges_sun := ranges_sun || new_range;
        END IF;
      END LOOP;
    END LOOP;

    UPDATE cafes SET opening_hours = jsonb_strip_nulls(jsonb_build_object(
      'mon', ranges_mon, 'tue', ranges_tue, 'wed', ranges_wed, 'thu', ranges_thu,
      'fri', ranges_fri, 'sat', ranges_sat, 'sun', ranges_sun,
      'note', NULLIF(array_to_string(notes, '; '), '')
    )) WHERE id = r.id;
  END LOOP;
END $$;