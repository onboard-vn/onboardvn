CREATE TABLE "barcode_lookups" (
	"code" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"result" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"editor_id" text,
	"snapshot" jsonb NOT NULL,
	"license_accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "name_vi" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "kind" text DEFAULT 'category' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "bgg_id" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "description_source" text DEFAULT 'original' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "description_rights_holder" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "description_permission_ref" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "description_license" text DEFAULT 'CC-BY-SA-4.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "video_urls" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "game_revisions" ADD CONSTRAINT "game_revisions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_revisions" ADD CONSTRAINT "game_revisions_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_revisions_game_id_idx" ON "game_revisions" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_kind_bgg_id_uq" ON "categories" USING btree ("kind","bgg_id");--> statement-breakpoint
UPDATE "wards" SET "slug" = "slug" || '-' || "code" WHERE ("province_code", "slug") IN (SELECT "province_code", "slug" FROM "wards" GROUP BY 1, 2 HAVING count(*) > 1);--> statement-breakpoint
CREATE UNIQUE INDEX "wards_province_slug_uq" ON "wards" USING btree ("province_code","slug");