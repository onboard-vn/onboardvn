CREATE TABLE "cafe_game_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cafe_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "contribution_blocked_at" timestamp;--> statement-breakpoint
ALTER TABLE "cafe_games" ADD COLUMN "source" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "cafe_game_events" ADD CONSTRAINT "cafe_game_events_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_game_events" ADD CONSTRAINT "cafe_game_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_game_events" ADD CONSTRAINT "cafe_game_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cafe_game_events_cafe_game_idx" ON "cafe_game_events" USING btree ("cafe_id","game_id");--> statement-breakpoint
CREATE INDEX "cafe_game_events_user_created_at_idx" ON "cafe_game_events" USING btree ("user_id","created_at");--> statement-breakpoint
UPDATE "cafe_games" SET "source" = 'owner' WHERE "added_via" = 'import';