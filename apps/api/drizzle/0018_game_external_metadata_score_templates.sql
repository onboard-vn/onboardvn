CREATE TABLE "game_external_metadata" (
	"game_id" uuid NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"best_players" smallint[] DEFAULT '{}'::smallint[] NOT NULL,
	"play_minutes_max" smallint,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"variant" text DEFAULT 'base' NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"definition" jsonb NOT NULL,
	"scoring_family" text,
	"confidence" text NOT NULL,
	"needs_review" boolean DEFAULT true NOT NULL,
	"sources" jsonb NOT NULL,
	"created_by" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_external_metadata" ADD CONSTRAINT "game_external_metadata_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_templates" ADD CONSTRAINT "score_templates_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_templates" ADD CONSTRAINT "score_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_templates" ADD CONSTRAINT "score_templates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_external_metadata_game_id_idx" ON "game_external_metadata" USING btree ("game_id","source");--> statement-breakpoint
CREATE UNIQUE INDEX "game_external_metadata_source_external_uq" ON "game_external_metadata" USING btree ("source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "score_templates_game_variant_version_uq" ON "score_templates" USING btree ("game_id","variant","version");--> statement-breakpoint
CREATE INDEX "score_templates_status_idx" ON "score_templates" USING btree ("status");