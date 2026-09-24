CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "game_barcodes" (
	"code" text PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"edition" text,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_categories" (
	"game_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "game_categories_game_id_category_id_pk" PRIMARY KEY("game_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_vi" text,
	"name_en" text NOT NULL,
	"min_players" smallint,
	"max_players" smallint,
	"play_minutes" smallint,
	"weight" numeric(3, 2),
	"min_age" smallint,
	"is_vietnamese" boolean DEFAULT false NOT NULL,
	"bgg_id" integer,
	"description_vi" text,
	"image_key" text,
	"image_credit" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug"),
	CONSTRAINT "games_bggId_unique" UNIQUE("bgg_id")
);
--> statement-breakpoint
ALTER TABLE "game_barcodes" ADD CONSTRAINT "game_barcodes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_barcodes_game_id_idx" ON "game_barcodes" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_categories_category_id_idx" ON "game_categories" USING btree ("category_id");