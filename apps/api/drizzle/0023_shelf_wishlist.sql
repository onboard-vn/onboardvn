CREATE TABLE "user_wishlist" (
	"user_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_wishlist_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
ALTER TABLE "user_games" ADD COLUMN "condition" text;--> statement-breakpoint
ALTER TABLE "user_games" ADD COLUMN "sleeved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_games" ADD COLUMN "box_protected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_games" ADD COLUMN "edition" text;--> statement-breakpoint
ALTER TABLE "user_wishlist" ADD CONSTRAINT "user_wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wishlist" ADD CONSTRAINT "user_wishlist_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_wishlist_game_id_idx" ON "user_wishlist" USING btree ("game_id");